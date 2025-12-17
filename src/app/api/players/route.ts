import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { hasPermission } from '@/lib/rbac/permissions';

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

    // Fetch players from PiSignage
    const response = await piSignageClient.getPlayers();
    
    // Response format: { stat_message, data: { objects: [...] }, success }
    const playersArray = response?.data?.objects || [];
    
    const players = playersArray.map((player: any) => ({
      ...player,
      status: player.isConnected ? 'online' : 'offline',
    }));

    return NextResponse.json({
      success: true,
      data: players,
      count: players.length,
    });
  } catch (error: any) {
    console.error('Players API error:', error.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch players' } },
      { status: 500 }
    );
  }
}
