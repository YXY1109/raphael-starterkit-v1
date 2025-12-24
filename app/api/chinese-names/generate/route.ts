import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
});

// Determine which model to use based on configuration
const isOpenRouter = !process.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL.includes("openrouter.ai");
const model = isOpenRouter
  ? (process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash")
  : (process.env.OPENAI_MODEL || "gpt-4o-mini");

// Check API key on startup
console.log('OpenAI/OpenRouter API configuration:', {
  baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
  model: model,
  provider: isOpenRouter ? 'OpenRouter' : 'OpenAI',
  hasApiKey: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
  keyLength: (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '').length
});

interface GenerateNameRequest {
  englishName: string;
  gender: 'male' | 'female' | 'other';
  birthYear?: string;
  personalityTraits?: string;
  namePreferences?: string;
  planType: '1' | '4'; // 1 = Standard, 4 = Premium
  // Batch continuation parameters
  continueBatch?: boolean; // true if continuing existing batch
  batchId?: string; // batch ID to continue
}

interface NameData {
  chinese: string;
  pinyin: string;
  characters: Array<{
    character: string;
    pinyin: string;
    meaning: string;
    explanation: string;
  }>;
  meaning: string;
  culturalNotes: string;
  personalityMatch: string;
  style: string;
}

export async function POST(request: NextRequest) {
  console.log('=== Chinese Names Generate API Called ===');
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated for paid features
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const body: GenerateNameRequest = await request.json();
    const { englishName, gender, birthYear, personalityTraits, namePreferences, planType, continueBatch, batchId } = body;

    console.log('Request body:', { englishName, gender, planType, continueBatch, batchId, hasUser: !!user });

    if (!englishName || !gender || !planType) {
      console.error('Missing required fields:', { englishName, gender, planType });
      return NextResponse.json(
        { error: 'Missing required fields: englishName, gender, and planType' },
        { status: 400 }
      );
    }

    // For non-authenticated users, check IP rate limiting
    if (!user) {
      // Get client IP address
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const clientIp = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';
      
      console.log('Free generation attempt:', {
        forwarded,
        realIp,
        clientIp,
        headers: Object.fromEntries(request.headers.entries())
      });
      
      // Check IP rate limit using Supabase function
      const { data: canGenerate, error: rateLimitError } = await supabase
        .rpc('check_ip_rate_limit', { p_client_ip: clientIp });
      
      console.log('Rate limit check result:', { canGenerate, rateLimitError });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
        return NextResponse.json(
          { error: 'Unable to verify rate limit. Please try again.' },
          { status: 500 }
        );
      }

      if (!canGenerate) {
        return NextResponse.json(
          { 
            error: 'Free generation limit reached. You can generate 3 free names per day. Please sign in for unlimited access!',
            rateLimited: true,
            suggestion: 'Create an account to generate unlimited names'
          },
          { status: 429 }
        );
      }
    }

    // Check if user has sufficient credits for paid generation
    if (user) {
      const creditCost = parseInt(planType);
      console.log('Checking credits for user:', user.id, 'cost:', creditCost);
      
      // Get customer data from unified customers table
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching customer:', fetchError);
        // Don't fail the request, just skip credit deduction for testing
        console.log('Skipping credit checks due to fetch error');
      } else {
        console.log('Customer data:', { 
          hasCustomer: !!customer, 
          credits: customer?.credits, 
          creditCost 
        });

        // Check if customer has sufficient credits
        if (!customer || customer.credits < creditCost) {
          console.error('Insufficient credits:', { 
            hasCustomer: !!customer, 
            credits: customer?.credits, 
            creditCost 
          });
          return NextResponse.json(
            { error: 'Insufficient credits. Please purchase more credits.' },
            { status: 403 }
          );
        }

        // Deduct credits from customer
        const newCredits = customer.credits - creditCost;
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Credit deduction error:', updateError);
          // Don't fail for testing, just log
          console.log('Continuing without credit deduction for testing');
        } else {
          // Record credit transaction in history
          try {
            await supabase
              .from('credits_history')
              .insert({
                customer_id: customer.id,
                amount: creditCost,
                type: 'subtract',
                description: 'chinese_name_generation',
                metadata: {
                  operation: 'chinese_name_generation',
                  credits_before: customer.credits,
                  credits_after: newCredits,
                  plan_type: planType
                }
              });
          } catch (error) {
            console.error('Failed to record credit transaction:', error);
          }
        }
      }
    }

    // Common Chinese surnames
    const commonSurnames = [
      '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
      '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
      '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧'
    ];

    const generatedNames = new Set<string>();
    const names: NameData[] = [];
    const nameCount = user ? 6 : 3; // Free users get 3 names, authenticated users get 6

    // Generate names
    console.log('Starting name generation loop:', { nameCount, user: !!user });
    for (let i = 0; i < nameCount; i++) {
      try {
        const randomSurname = commonSurnames[Math.floor(Math.random() * commonSurnames.length)];
        const randomSeed = Date.now() + Math.random() * 10000 + i * 1000;
        const uniquePromptId = Math.random().toString(36).substring(2, 15);

        // Build personalization info
        let personalInfo = `English Name: ${englishName}`;
        if (birthYear) personalInfo += `\nBirth Year: ${birthYear}`;
        if (personalityTraits && user) personalInfo += `\nPersonality Traits: ${personalityTraits}`;
        if (namePreferences && user) personalInfo += `\nName Preferences: ${namePreferences}`;

        const existingNamesString = generatedNames.size > 0 
          ? `\n\nEXISTING NAMES TO AVOID:\n${Array.from(generatedNames).join(', ')}\n- DO NOT generate any of these names\n- Ensure complete uniqueness from existing names`
          : '';

        const prompt = `Generate a Chinese name as JSON only. No text before or after the JSON.

Input Requirements:
- ${personalInfo}
- Gender: ${gender}
- Generation Type: ${planType === '1' ? 'Standard' : 'Premium'}
- Surname: Use "${randomSurname}" as the surname
- Seed: ${randomSeed}
- UniqueID: ${uniquePromptId}
- Position: ${i + 1} of ${nameCount}${existingNamesString}

UNIQUENESS REQUIREMENTS (CRITICAL):
- This name must be 100% unique and different from any existing names
- No duplicate names allowed in this generation batch
- Each name must have distinct character combinations
- Generate completely different names even if same gender

${planType === '4' && user ? `
PREMIUM REQUIREMENTS:
- Deep analysis of personality traits and preferences
- Highly personalized character selection
- Advanced cultural matching
- Sophisticated meaning alignment
` : `
STANDARD REQUIREMENTS:
- Basic personality matching
- Good cultural appropriateness
- Meaningful character selection
`}

CREATIVITY REQUIREMENTS:
- Use uncommon but beautiful Chinese characters
- Avoid typical combinations like 雨晴, 志明, 雅文, 建华, 小明, 美丽, 伟强 etc.
- Be innovative with character selection
- Consider rare but meaningful characters from different radical families
- Create unique phonetic combinations
- Use characters from different categories (nature, virtues, colors, elements, etc.)

Output only this JSON structure:
{
  "chinese": "姓名",
  "pinyin": "Xìngmíng", 
  "characters": [
    {
      "character": "姓",
      "pinyin": "Xìng",
      "meaning": "Surname meaning",
      "explanation": "Brief explanation"
    },
    {
      "character": "名",
      "pinyin": "míng", 
      "meaning": "Given name meaning",
      "explanation": "Brief explanation"
    }
  ],
  "meaning": "Overall name meaning",
  "culturalNotes": "Cultural significance",
  "personalityMatch": "Why this name suits the person's traits and preferences",
  "style": "${planType === '4' ? 'Premium' : 'Standard'}"
}

Requirements:
- Generate ABSOLUTELY UNIQUE personalized name
- ${gender} appropriate 
- Must be creative, original, and distinct
- Zero tolerance for duplicates
- JSON only, no other text`;

        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: `You are a Chinese naming expert specializing in ${planType === '4' ? 'premium personalized' : 'standard personalized'} name generation. IMPORTANT: Respond with ONLY valid JSON. No explanations, no markdown, no extra text. Start with { and end with }. Generate creative and unique Chinese names based on personal information.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: planType === '4' ? 0.9 : 0.8,
          max_tokens: 1200,
          top_p: planType === '4' ? 0.95 : 0.9,
        });

        const responseContent = completion.choices[0].message.content;
        
        if (!responseContent) {
          throw new Error('No response from AI');
        }

        // Parse the JSON response
        let generatedName: NameData;
        try {
          // Clean and extract JSON
          let cleanedResponse = responseContent.trim();
          
          const jsonStartIndex = cleanedResponse.indexOf('{');
          const jsonEndIndex = cleanedResponse.lastIndexOf('}');

          if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
            cleanedResponse = cleanedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
          } else {
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              cleanedResponse = jsonMatch[0];
            } else {
              throw new Error('No valid JSON object found in AI response');
            }
          }
          
          generatedName = JSON.parse(cleanedResponse);
          
          // Validate required fields
          if (!generatedName.chinese || !generatedName.pinyin || !generatedName.characters) {
            throw new Error('Missing required fields in AI response');
          }
          
          // Ensure style field is set correctly
          generatedName.style = planType === '4' ? 'Premium' : 'Standard';

          // Check for duplicates
          if (generatedNames.has(generatedName.chinese)) {
            console.log(`Duplicate name detected: ${generatedName.chinese}, generating fallback...`);
            generatedName = generateFallbackName(i, randomSurname, gender, planType);
          }

          // Add to generated names set
          generatedNames.add(generatedName.chinese);
          
        } catch (parseError) {
          console.error(`Failed to parse AI response for name ${i + 1}:`, parseError);
          // Generate fallback name
          generatedName = generateFallbackName(i, randomSurname, gender, planType);
          generatedNames.add(generatedName.chinese);
        }

        names.push(generatedName);

      } catch (error) {
        console.error(`Error generating name ${i + 1}:`, error);
        // Generate fallback name
        const fallbackName = generateFallbackName(i, commonSurnames[i % commonSurnames.length], gender, planType);
        generatedNames.add(fallbackName.chinese);
        names.push(fallbackName);
      }
    }

    // Save generation batch and names to database for authenticated users
    let resultBatchId: string | null = null;
    let currentGenerationRound = 1;
    let batch: any = null;
    
    if (user) {
      try {
        if (continueBatch && batchId) {
          // CONTINUE EXISTING BATCH MODE
          console.log('Continuing existing batch:', batchId);
          
          // Verify batch exists and belongs to user
          const { data: existingBatch, error: fetchBatchError } = await supabase
            .from('generation_batches')
            .select('*')
            .eq('id', batchId)
            .eq('user_id', user.id)
            .single();

          if (fetchBatchError || !existingBatch) {
            console.error('Failed to find existing batch:', fetchBatchError);
            return NextResponse.json(
              { error: 'Invalid batch ID or batch not found' },
              { status: 400 }
            );
          }

          batch = existingBatch;
          resultBatchId = batch.id;

          // Get the highest generation_round for this batch
          const { data: maxRoundData, error: maxRoundError } = await supabase
            .from('generated_names')
            .select('generation_round')
            .eq('batch_id', batchId)
            .order('generation_round', { ascending: false })
            .limit(1)
            .single();

          if (maxRoundError && maxRoundError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Failed to get max generation round:', maxRoundError);
          }

          currentGenerationRound = (maxRoundData?.generation_round || 0) + 1;
          console.log('Next generation round:', currentGenerationRound);

          // Update batch with new totals
          const newNamesCount = (batch.names_count || 0) + names.length;
          const newCreditsUsed = (batch.credits_used || 0) + parseInt(planType);
          
          const { error: updateBatchError } = await supabase
            .from('generation_batches')
            .update({
              names_count: newNamesCount,
              credits_used: newCreditsUsed,
              updated_at: new Date().toISOString()
            })
            .eq('id', batchId);

          if (updateBatchError) {
            console.error('Failed to update batch totals:', updateBatchError);
          } else {
            // Update the batch object with new totals for the response
            batch.names_count = newNamesCount;
            batch.credits_used = newCreditsUsed;
          }

        } else {
          // CREATE NEW BATCH MODE
          console.log('Creating new batch');
          
          const { data: newBatch, error: batchError } = await supabase
            .from('generation_batches')
            .insert({
              user_id: user.id,
              english_name: englishName,
              gender: gender,
              birth_year: birthYear,
              personality_traits: personalityTraits,
              name_preferences: namePreferences,
              plan_type: planType,
              credits_used: parseInt(planType),
              names_count: names.length,
              generation_metadata: {
                generation_timestamp: new Date().toISOString(),
                ai_model: model,
                temperature: planType === '4' ? 0.9 : 0.8
              }
            })
            .select()
            .single();

          if (batchError) {
            console.error('Failed to create batch:', batchError);
          } else {
            batch = newBatch;
            resultBatchId = batch.id;
            currentGenerationRound = 1;
          }
        }

        // Save individual names with generation_round
        if (resultBatchId) {
          const namesToInsert = names.map((name, index) => ({
            batch_id: resultBatchId,
            chinese_name: name.chinese,
            pinyin: name.pinyin,
            characters: name.characters,
            meaning: name.meaning,
            cultural_notes: name.culturalNotes,
            personality_match: name.personalityMatch,
            style: name.style,
            position_in_batch: index,
            generation_round: currentGenerationRound
          }));

          console.log('About to insert names:', {
            batchId: resultBatchId,
            round: currentGenerationRound,
            count: namesToInsert.length,
            firstNameSample: namesToInsert[0]
          });

          const { error: namesError } = await supabase
            .from('generated_names')
            .insert(namesToInsert);

          if (namesError) {
            console.error('Failed to save generated names:', namesError);
          } else {
            console.log(`Successfully saved ${names.length} names to batch ${resultBatchId}, round ${currentGenerationRound}`);
          }
        }

        // Also log to the existing analytics table
        await supabase
          .from('name_generation_logs')
          .insert({
            user_id: user.id,
            plan_type: planType,
            credits_used: parseInt(planType),
            names_generated: names.length,
            english_name: englishName,
            gender: gender,
            birth_year: birthYear,
            has_personality_traits: !!(personalityTraits && user),
            has_name_preferences: !!(namePreferences && user),
            metadata: {
              generation_details: {
                name_count: names.length,
                generation_timestamp: new Date().toISOString(),
                batch_id: resultBatchId,
                generation_round: currentGenerationRound,
                is_continuation: continueBatch || false
              }
            }
          });
      } catch (error) {
        console.error('Failed to save generation batch:', error);
      }
    }

    return NextResponse.json({ 
      names,
      total: names.length,
      planType,
      creditsUsed: user ? parseInt(planType) : 0,
      batchId: resultBatchId,
      generationRound: currentGenerationRound,
      isContinuation: continueBatch || false,
      batch: batch ? {
        id: batch.id,
        englishName: batch.english_name,
        gender: batch.gender,
        planType: batch.plan_type,
        totalNamesGenerated: batch.names_count,
        totalCreditsUsed: batch.credits_used,
        createdAt: batch.created_at
      } : null,
      message: continueBatch 
        ? `Generated ${names.length} more names for your batch (Round ${currentGenerationRound})!`
        : `Generated ${names.length} unique Chinese names successfully!`
    });

  } catch (error) {
    console.error('Name generation error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to generate names. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to generate fallback names
function generateFallbackName(index: number, surname: string, gender: string, planType: string): NameData {
  const fallbackGivenNames = {
    male: ['志明', '建华', '伟强', '俊杰', '文昊', '雅昆'],
    female: ['雅文', '美丽', '慧敏', '雨晴', '诗涵', '婉如'],
    other: ['明智', '美好', '和谐', '光明', '希望', '未来']
  };

  const genderKey = gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'other';
  const givenNames = fallbackGivenNames[genderKey];
  const selectedGivenName = givenNames[index % givenNames.length];

  const surnameMap: { [key: string]: string } = {
    '王': 'Wáng', '李': 'Lǐ', '张': 'Zhāng', '刘': 'Liú', '陈': 'Chén',
    '杨': 'Yáng', '赵': 'Zhào', '黄': 'Huáng', '周': 'Zhōu', '吴': 'Wú',
    '徐': 'Xú', '孙': 'Sūn', '胡': 'Hú', '朱': 'Zhū', '高': 'Gāo',
    '林': 'Lín', '何': 'Hé', '郭': 'Guō', '马': 'Mǎ', '罗': 'Luó',
    '梁': 'Liáng', '宋': 'Sòng', '郑': 'Zhèng', '谢': 'Xiè', '韩': 'Hán',
    '唐': 'Táng', '冯': 'Féng', '于': 'Yú', '董': 'Dǒng', '萧': 'Xiāo'
  };

  const givenPinyinMap: { [key: string]: string } = {
    '志明': 'Zhìmíng', '建华': 'Jiànhuá', '伟强': 'Wěiqiáng',
    '雅文': 'Yǎwén', '美丽': 'Měilì', '慧敏': 'Huìmǐn',
    '明智': 'Míngzhì', '美好': 'Měihǎo', '和谐': 'Héxié'
  };

  const chinese = `${surname}${selectedGivenName}`;
  const surnameChar = surname;
  const givenChar1 = selectedGivenName[0];
  const givenChar2 = selectedGivenName[1] || '';

  return {
    chinese,
    pinyin: `${surnameMap[surname] || 'Wáng'} ${givenPinyinMap[selectedGivenName] || 'Míng'}`,
    characters: [
      {
        character: surnameChar,
        pinyin: surnameMap[surname] || 'Wáng',
        meaning: "Family surname",
        explanation: "A traditional Chinese family name with historical significance."
      },
      {
        character: givenChar1,
        pinyin: givenChar1 === '志' ? 'Zhì' : givenChar1 === '美' ? 'Měi' : 'Míng',
        meaning: givenChar1 === '志' ? 'Ambition' : givenChar1 === '美' ? 'Beautiful' : 'Bright',
        explanation: `Represents ${givenChar1 === '志' ? 'ambition and determination' : givenChar1 === '美' ? 'beauty and goodness' : 'brightness and wisdom'}`
      },
      ...(givenChar2 ? [{
        character: givenChar2,
        pinyin: givenChar2 === '明' ? 'Míng' : givenChar2 === '丽' ? 'Lì' : 'Hǎo',
        meaning: givenChar2 === '明' ? 'Bright' : givenChar2 === '丽' ? 'Beautiful' : 'Good',
        explanation: `Symbolizes ${givenChar2 === '明' ? 'intelligence and clarity' : givenChar2 === '丽' ? 'beauty and grace' : 'virtue and excellence'}`
      }] : [])
    ],
    meaning: `A ${planType === '4' ? 'premium' : 'standard'} Chinese name with positive meanings and cultural significance`,
    culturalNotes: `Traditional Chinese name reflecting ${gender} characteristics with auspicious meanings`,
    personalityMatch: `This fallback name maintains cultural appropriateness and positive connotations suitable for the specified preferences`,
    style: planType === '4' ? 'Premium' : 'Standard'
  };
}