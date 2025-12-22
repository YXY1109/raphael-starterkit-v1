import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = page * limit;

    // Fetch generation batches with their names
    const { data: batches, error: batchesError } = await supabase
      .from('generation_batches')
      .select(`
        id,
        english_name,
        gender,
        birth_year,
        personality_traits,
        name_preferences,
        plan_type,
        credits_used,
        names_count,
        created_at,
        generated_names (
          id,
          chinese_name,
          pinyin,
          characters,
          meaning,
          cultural_notes,
          personality_match,
          style,
          position_in_batch
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchesError) {
      console.error('Database error:', batchesError);
      return NextResponse.json({ error: 'Failed to fetch generation history' }, { status: 500 });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('generation_batches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ error: 'Failed to get total count' }, { status: 500 });
    }

    // Transform the data to match frontend expectations
    const transformedBatches = batches?.map(batch => ({
      id: batch.id,
      englishName: batch.english_name,
      gender: batch.gender,
      birthYear: batch.birth_year,
      personalityTraits: batch.personality_traits,
      namePreferences: batch.name_preferences,
      planType: batch.plan_type,
      creditsUsed: batch.credits_used,
      namesCount: batch.names_count,
      createdAt: batch.created_at,
      names: batch.generated_names
        ?.sort((a, b) => a.position_in_batch - b.position_in_batch)
        ?.map(name => ({
          chinese: name.chinese_name,
          pinyin: name.pinyin,
          characters: name.characters,
          meaning: name.meaning,
          culturalNotes: name.cultural_notes,
          personalityMatch: name.personality_match,
          style: name.style
        })) || []
    })) || [];

    return NextResponse.json({
      batches: transformedBatches,
      pagination: {
        currentPage: page,
        limit,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: offset + limit < (count || 0),
        hasPrevPage: page > 0
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('id');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    // Verify ownership and delete
    const { error: deleteError } = await supabase
      .from('generation_batches')
      .delete()
      .eq('id', batchId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Batch deleted successfully' });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}