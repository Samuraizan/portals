import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { hasPermission } from '@/lib/rbac/permissions';

// Location mapping based on player names
const LOCATION_MAP: Record<string, string> = {
  'Schelling Point': 'SFO',
  'Multiverse': 'SFO',
  'Degen Lounge': 'SFO',
  'Entrance Lobby': 'SFO',
  '2nd Floor': 'SFO',
  'BLR': 'BLR',
  'Blrxzo': 'BLR',
};

function determineLocation(playerName: string): string {
  for (const [keyword, location] of Object.entries(LOCATION_MAP)) {
    if (playerName.toLowerCase().includes(keyword.toLowerCase())) {
      return location;
    }
  }
  return 'UNKNOWN';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Only admins can sync players
    if (!hasPermission(session.user, 'canManageUsers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Fetch all players from PiSignage
    const response = await piSignageClient.getPlayers();
    
    if (!response.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'PISIGNAGE_ERROR', message: 'Failed to fetch players from PiSignage' },
      }, { status: 500 });
    }

    const players = response.data?.objects || [];
    const results = {
      total: players.length,
      synced: 0,
      errors: [] as string[],
    };

    // Upsert each player to Supabase
    for (const player of players) {
      try {
        const { error } = await supabase
          .from('player_cache')
          .upsert({
            pisignage_id: player._id,
            name: player.name,
            location: determineLocation(player.name),
            orientation: player.orientation || 'landscape',
            current_playlist: player.currentPlaylist || player.playlistOn || null,
            status: player.isConnected ? 'online' : 'offline',
            last_seen: player.lastReported 
              ? new Date(player.lastReported).toISOString()
              : new Date().toISOString(),
            metadata: {
              cpuSerialNumber: player.cpuSerialNumber,
              group: player.group,
              version: player.version,
              myIpAddress: player.myIpAddress,
              tvStatus: player.tvStatus,
            },
          }, {
            onConflict: 'pisignage_id',
          });

        if (error) {
          results.errors.push(`${player.name}: ${error.message}`);
        } else {
          results.synced++;
        }
      } catch (err) {
        results.errors.push(`${player.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Log the sync action
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('zo_user_id', session.user.id)
        .single();

      if (dbUser) {
        await supabase.from('audit_logs').insert({
          user_id: dbUser.id,
          phone_number: session.user.mobile_number,
          action: 'sync',
          resource_type: 'player_cache',
          metadata: results,
          ip_address: request.headers.get('x-forwarded-for'),
          user_agent: request.headers.get('user-agent'),
        });
      }
    } catch {
      // Audit log failure is not critical
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced}/${results.total} players`,
      data: results,
    });

  } catch (error) {
    console.error('Sync players error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync players' } },
      { status: 500 }
    );
  }
}

// GET to check sync status
export async function GET() {
  try {
    const { data: cachedPlayers, error } = await supabase
      .from('player_cache')
      .select('pisignage_id, name, location, status, last_seen, updated_at')
      .order('name');

    if (error) {
      return NextResponse.json({
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      }, { status: 500 });
    }

    // Get PiSignage count for comparison
    const piResponse = await piSignageClient.getPlayers();
    const piCount = piResponse.data?.objects?.length ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        cached: cachedPlayers?.length ?? 0,
        pisignage: piCount,
        inSync: (cachedPlayers?.length ?? 0) === piCount,
        players: cachedPlayers,
      },
    });

  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get sync status' } },
      { status: 500 }
    );
  }
}

