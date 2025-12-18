import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { hasPermission } from '@/lib/rbac/permissions';
import { filterAllowedPlayersWithCustom } from '@/lib/rbac/permissions-server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Players API] Starting request...');
    const session = await getSession();

    if (!session) {
      console.log('[Players API] No session');
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    console.log('[Players API] User:', session.user?.mobile_number, 'Roles:', session.user?.roles);

    if (!hasPermission(session.user, 'canViewPlayers')) {
      console.log('[Players API] No permission to view players');
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No permission' } },
        { status: 403 }
      );
    }

    // Fetch all players from PiSignage
    console.log('[Players API] Fetching from PiSignage...');
    const response = await piSignageClient.getPlayers();
    console.log('[Players API] PiSignage response success:', response.success);
    
    if (!response.success) {
      console.error('[Players API] PiSignage error:', response.error);
      return NextResponse.json({
        success: false,
        error: { code: 'PISIGNAGE_ERROR', message: response.error?.message || 'Failed to fetch from PiSignage' },
      }, { status: 500 });
    }
    
    // Response format: { data: { objects: [...] }, success }
    const playersArray = response?.data?.objects || [];
    console.log('[Players API] Raw players count:', playersArray.length);
    
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
    console.log('[Players API] Filtered players count:', allowedPlayers.length);

    return NextResponse.json({
      success: true,
      data: allowedPlayers,
      count: allowedPlayers.length,
      totalCount: allPlayers.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Players API] Error:', message, error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch players' } },
      { status: 500 }
    );
  }
}
