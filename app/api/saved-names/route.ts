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

    // Fetch saved names for the user
    const { data: savedNames, error } = await supabase
      .from('saved_names')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch saved names' }, { status: 500 });
    }

    return NextResponse.json({ 
      names: savedNames || [],
      count: savedNames?.length || 0
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      chinese_name,
      pinyin,
      meaning,
      cultural_notes,
      personality_match,
      characters,
      generation_metadata
    } = body;

    if (!chinese_name || !pinyin || !meaning) {
      return NextResponse.json(
        { error: 'Missing required fields: chinese_name, pinyin, meaning' },
        { status: 400 }
      );
    }

    // Check if name already exists for this user
    const { data: existing } = await supabase
      .from('saved_names')
      .select('id')
      .eq('user_id', user.id)
      .eq('chinese_name', chinese_name)
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Name already saved',
        name_id: existing.id 
      }, { status: 409 });
    }

    // Save the name
    const { data: savedName, error } = await supabase
      .from('saved_names')
      .insert({
        user_id: user.id,
        chinese_name,
        pinyin,
        meaning,
        cultural_notes,
        personality_match,
        characters,
        generation_metadata,
        is_favorite: true
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save name' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Name saved successfully',
      name: savedName
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}