import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { hasPermission, filterAllowedPlayers } from '@/lib/rbac/permissions';
import { Player, PlayerGroup } from '@/types/player';

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
        { success: false, error: { code: 'FORBIDDEN', message: 'No permission to view players' } },
        { status: 403 }
      );
    }

    // Fetch all players from PiSignage
    const response = await piSignageClient.getPlayers();
    
    if (!response.success) {
      console.error('[Players API] PiSignage error:', response.error);
      return NextResponse.json({
        success: false,
        error: { code: 'PISIGNAGE_ERROR', message: response.error?.message || 'Failed to fetch from PiSignage' },
      }, { status: 500 });
    }
    
    // Response format: { data: { objects: [...] }, success }
    const playersArray = response?.data?.objects || [];
    
    // Map player data with required fields and proper types
    const allPlayers: Player[] = playersArray.map((player: Record<string, unknown>) => {
      const group = player.group as PlayerGroup | undefined;
      const isConnected = Boolean(player.isConnected);
      
      return {
        _id: String(player._id || ''),
        name: String(player.name || ''),
        cpuSerialNumber: String(player.cpuSerialNumber || ''),
        group: group || { _id: '', name: '' },
        playlistOn: Boolean(player.playlistOn),
        currentPlaylist: String(player.currentPlaylist || ''),
        lastReported: typeof player.lastReported === 'number' ? player.lastReported : Date.now(),
        tvStatus: Boolean(player.tvStatus),
        isConnected,
        status: isConnected ? 'online' : 'offline',
        configLocation: player.configLocation as string | undefined,
        version: player.version as string | undefined,
        myIpAddress: player.myIpAddress as string | undefined,
      };
    });

    // Filter based on user's role permissions (sync - no DB access)
    const allowedPlayers = filterAllowedPlayers(session.user, allPlayers);

    return NextResponse.json({
      success: true,
      data: allowedPlayers,
      count: allowedPlayers.length,
      totalCount: allPlayers.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Players API] Error:', message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch players' } },
      { status: 500 }
    );
  }
}
