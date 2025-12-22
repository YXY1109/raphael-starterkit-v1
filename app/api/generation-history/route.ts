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

    // Fetch generation logs for the user
    const { data: logs, error: logsError } = await supabase
      .from('name_generation_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error('Database error:', logsError);
      return NextResponse.json({ error: 'Failed to fetch generation history' }, { status: 500 });
    }

    // Calculate statistics
    const stats = {
      total_generations: logs?.length || 0,
      total_credits_used: logs?.reduce((sum, log) => sum + (log.credits_used || 0), 0) || 0,
      total_names_generated: logs?.reduce((sum, log) => sum + (log.names_generated || 0), 0) || 0,
      avg_per_session: logs?.length > 0 
        ? (logs.reduce((sum, log) => sum + (log.names_generated || 0), 0) / logs.length) 
        : 0
    };

    // Process logs to include computed fields
    const processedLogs = logs?.map(log => ({
      ...log,
      has_personality_traits: Boolean(log.metadata?.personalityTraits),
      has_name_preferences: Boolean(log.metadata?.namePreferences)
    })) || [];

    return NextResponse.json({ 
      logs: processedLogs,
      stats
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}