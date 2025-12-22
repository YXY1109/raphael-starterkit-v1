import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
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

    // Delete the saved name (only if it belongs to the user)
    const { error } = await supabase
      .from('saved_names')
      .delete()
      .eq('id', nameId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to delete name' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Name deleted successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await request.json();
    const { is_favorite, is_selected } = body;

    const updateData: any = {};
    if (typeof is_favorite === 'boolean') updateData.is_favorite = is_favorite;
    if (typeof is_selected === 'boolean') updateData.is_selected = is_selected;

    // If setting as selected, unselect all other names first
    if (is_selected === true) {
      await supabase
        .from('saved_names')
        .update({ is_selected: false })
        .eq('user_id', user.id);
    }

    // Update the saved name
    const { data: updatedName, error } = await supabase
      .from('saved_names')
      .update(updateData)
      .eq('id', nameId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Name updated successfully',
      name: updatedName
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}