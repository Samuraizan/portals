import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { piSignageClient } from '@/lib/pisignage-api/client';

export async function GET() {
  const health = {
    timestamp: new Date().toISOString(),
    supabase: { status: 'unknown', tables: {} as Record<string, number | string> },
    pisignage: { status: 'unknown', playerCount: 0 },
  };

  // Test Supabase connection
  try {
    // Check users table
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) {
      health.supabase.tables['users'] = `ERROR: ${usersError.message}`;
    } else {
      health.supabase.tables['users'] = usersCount ?? 0;
    }

    // Check player_cache table
    const { count: playersCount, error: playersError } = await supabase
      .from('player_cache')
      .select('*', { count: 'exact', head: true });
    
    if (playersError) {
      health.supabase.tables['player_cache'] = `ERROR: ${playersError.message}`;
    } else {
      health.supabase.tables['player_cache'] = playersCount ?? 0;
    }

    // Check user_player_permissions table
    const { count: permsCount, error: permsError } = await supabase
      .from('user_player_permissions')
      .select('*', { count: 'exact', head: true });
    
    if (permsError) {
      health.supabase.tables['user_player_permissions'] = `ERROR: ${permsError.message}`;
    } else {
      health.supabase.tables['user_player_permissions'] = permsCount ?? 0;
    }

    // Check audit_logs table
    const { count: logsCount, error: logsError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });
    
    if (logsError) {
      health.supabase.tables['audit_logs'] = `ERROR: ${logsError.message}`;
    } else {
      health.supabase.tables['audit_logs'] = logsCount ?? 0;
    }

    // Determine overall Supabase status
    const hasErrors = Object.values(health.supabase.tables).some(
      v => typeof v === 'string' && v.startsWith('ERROR')
    );
    health.supabase.status = hasErrors ? 'partial' : 'ok';

  } catch (error) {
    health.supabase.status = 'error';
    health.supabase.tables['_error'] = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test PiSignage connection
  try {
    const response = await piSignageClient.getPlayers();
    if (response.success) {
      health.pisignage.status = 'ok';
      health.pisignage.playerCount = response.data?.objects?.length ?? 0;
    } else {
      health.pisignage.status = 'error';
    }
  } catch (error) {
    health.pisignage.status = 'error';
  }

  const overallStatus = 
    health.supabase.status === 'ok' && health.pisignage.status === 'ok' 
      ? 'healthy' 
      : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    ...health,
  });
}

