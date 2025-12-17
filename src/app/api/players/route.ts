import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { hasPermission } from '@/lib/rbac/permissions';
import { filterAllowedPlayersWithCustom } from '@/lib/rbac/permissions-server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canViewPlayers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No permission' } },
        { status: 403 }
      );
    }

    // Fetch all players from PiSignage
    const response = await piSignageClient.getPlayers();
    
    // Response format: { data: { objects: [...] }, success }
    const playersArray = response?.data?.objects || [];
    
    // Map player data with required fields
    const allPlayers = playersArray.map((player: Record<string, unknown>) => ({
      _id: player._id as string,
      name: player.name as string,
      cpuSerialNumber: player.cpuSerialNumber || '',
      group: player.group || { _id: '', name: '' },
      playlistOn: player.playlistOn || '',
      lastReported: player.lastReported || new Date().toISOString(),
      tvStatus: player.tvStatus || false,
      isConnected: player.isConnected || false,
      status: player.isConnected ? 'online' : 'offline',
      ...player,
    }));

    // Filter based on user's permissions (including database-stored custom permissions)
    const allowedPlayers = await filterAllowedPlayersWithCustom(session.user, allPlayers);

    return NextResponse.json({
      success: true,
      data: allowedPlayers,
      count: allowedPlayers.length,
      totalCount: allPlayers.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Players API error:', message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch players' } },
      { status: 500 }
    );
  }
}
