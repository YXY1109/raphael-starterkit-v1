import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Security: All sensitive information (appid, token) is stored in environment variables
    // and never logged or exposed in responses
    const supabase = await createClient();
    
    // Check if user is authenticated (TTS is only for registered users)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required for voice playback' }, { status: 401 });
    }

    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Check if we have TTS configuration
    const appid = process.env.DOUBAO_TTS_APPID;
    const accessToken = process.env.DOUBAO_TTS_ACCESS_TOKEN;
    
    console.log('TTS Config Check:', { 
      hasAppid: !!appid, 
      hasAccessToken: !!accessToken,
      appidLength: appid?.length,
      tokenLength: accessToken?.length 
    });
    
    if (!appid || !accessToken) {
      console.error('TTS Configuration Missing:', { appid: !!appid, accessToken: !!accessToken });
      return NextResponse.json({ 
        error: 'TTS service not configured',
        message: 'Voice playback is currently unavailable. Please check the TTS configuration.' 
      }, { status: 503 });
    }

    // Generate unique request ID
    const reqid = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Prepare request payload for Doubao TTS
    const payload = {
      app: {
        appid: appid,
        token: accessToken,
        cluster: "volcano_tts"
      },
      user: {
        uid: user.id
      },
      audio: {
        voice_type: "zh_female_tianmeiyueyue_moon_bigtts",
        encoding: "mp3",
        speed_ratio: 0.9
      },
      request: {
        reqid: reqid,
        text: text,
        operation: "query"
      }
    };

    console.log('TTS Request:', { 
      reqid, 
      text: text.substring(0, 50) + '...',
      voice_type: payload.audio.voice_type,
      speed_ratio: payload.audio.speed_ratio
    });

    // Call Doubao TTS API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response: Response;
    try {
      response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer;${accessToken}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('TTS API Fetch Error:', fetchError);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'TTS request timeout', 
          details: 'The TTS service took too long to respond' 
        }, { status: 504 });
      }
      
      return NextResponse.json({ 
        error: 'TTS network error', 
        details: fetchError instanceof Error ? fetchError.message : 'Unknown network error' 
      }, { status: 503 });
    }

    console.log('TTS API Response Status:', response.status, response.statusText);
    console.log('TTS API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText.substring(0, 200) + (errorText.length > 200 ? '...' : ''),
        url: 'https://openspeech.bytedance.com/api/v1/tts'
      });
      return NextResponse.json({ 
        error: 'TTS service unavailable', 
        details: `HTTP ${response.status}: ${errorText}`,
        debugInfo: {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        }
      }, { status: 502 });
    }

    const result = await response.json();
    
    console.log('TTS Response:', { 
      reqid: result.reqid, 
      code: result.code, 
      message: result.message,
      hasData: !!result.data
    });

    if (result.code !== 3000) {
      console.error('TTS Service Error:', {
        reqid: result.reqid,
        code: result.code,
        message: result.message
      });
      return NextResponse.json({ 
        error: 'TTS generation failed', 
        details: result.message || 'Unknown error' 
      }, { status: 500 });
    }

    // Return the audio data (base64 encoded MP3)
    return NextResponse.json({
      success: true,
      reqid: result.reqid,
      audioData: result.data,
      duration: result.addition?.duration,
      message: 'TTS generated successfully'
    });

  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate voice audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}