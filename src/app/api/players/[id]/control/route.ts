import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { canAccessPlayer, hasPermission } from '@/lib/rbac/permissions';
import { supabase } from '@/lib/db/client';
import { z } from 'zod';

const controlSchema = z.object({
  action: z.enum(['pause', 'forward', 'backward']),
});

export async function POST(
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

    if (!hasPermission(session.user, 'canControlPlayback')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to control playback',
          },
        },
        { status: 403 }
      );
    }

    // Get player to check access
    const playerResponse = await piSignageClient.getPlayer(playerId);
    if (!playerResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Player not found',
          },
        },
        { status: 404 }
      );
    }

    const player = playerResponse.data;
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

    const body = await request.json();
    const { action } = controlSchema.parse(body);

    // Control playback
    const result = await piSignageClient.controlPlayback(playerId, action);

    // Log audit
    try {
      // const dbUser = // await prisma.user.findUnique({
        where: { zoUserId: session.user.id },
      });

      if (dbUser) {
        // await prisma.auditLog.create({
          data: {
            userId: dbUser.id,
            phoneNumber: session.user.mobile_number,
            action: 'control',
            resourceType: 'player',
            resourceId: playerId,
            metadata: { action, playerName: player.name },
            ipAddress: request.headers.get('x-forwarded-for'),
            userAgent: request.headers.get('user-agent'),
          },
        });
      }
    } catch (dbError) {
      console.warn('Failed to create audit log:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: result.stat_message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error('Player control API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to control player',
        },
      },
      { status: 500 }
    );
  }
}

