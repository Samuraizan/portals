import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { canAccessPlayer, hasPermission } from '@/lib/rbac/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id: playerId } = await params;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canViewPlayers')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view players',
          },
        },
        { status: 403 }
      );
    }

    // Fetch player from PiSignage
    const playerResponse = await piSignageClient.getPlayerById(playerId);

    if (!playerResponse.success || !playerResponse.data) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Player not found' } },
        { status: 404 }
      );
    }

    const player = playerResponse.data;

    // Check player access
    if (!canAccessPlayer(session.user, player._id, player.name)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this player',
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: player,
    });
  } catch (error) {
    console.error('Player detail API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch player',
        },
      },
      { status: 500 }
    );
  }
}

