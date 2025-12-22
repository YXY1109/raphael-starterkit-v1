import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: nameId } = await params;

    // First, unselect all names for this user
    await supabase
      .from('saved_names')
      .update({ is_selected: false })
      .eq('user_id', user.id);

    // Then select the specified name
    const { data: selectedName, error } = await supabase
      .from('saved_names')
      .update({ is_selected: true })
      .eq('id', nameId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to select name' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Name selected successfully',
      name: selectedName
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}