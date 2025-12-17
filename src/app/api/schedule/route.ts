import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { supabase } from '@/lib/db/client';
import { hasPermission, canAccessPlayer } from '@/lib/rbac/permissions';
import { z } from 'zod';

const createScheduleSchema = z.object({
  playlistName: z.string().min(1),
  playerIds: z.array(z.string()).min(1),
  contentIds: z.array(z.string()).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  assets: z.array(
    z.object({
      filename: z.string(),
      duration: z.number().optional().default(10),
    })
  ).min(1),
});

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canScheduleContent')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Get schedules from database
    try {
      // const schedules = // await prisma.scheduleHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return NextResponse.json({
        success: true,
        data: schedules,
      });
    } catch {
      // If database not available, return empty
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
  } catch (error) {
    console.error('Schedule API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch schedules' } },
      { status: 500 }
    );
  }
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

    if (!hasPermission(session.user, 'canScheduleContent')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to create schedules' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createScheduleSchema.parse(body);

    // Validate player access
    const playersResponse = await piSignageClient.getPlayers();
    const playerMap = new Map(
      playersResponse.data.objects.map((p) => [p._id, p])
    );

    for (const playerId of validated.playerIds) {
      const player = playerMap.get(playerId);
      if (!player) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: `Player ${playerId} not found` } },
          { status: 404 }
        );
      }
      if (!canAccessPlayer(session.user, playerId, player.name)) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: `No access to player ${player.name}` } },
          { status: 403 }
        );
      }
    }

    // Create or update playlist in PiSignage
    try {
      await piSignageClient.createPlaylist(validated.playlistName);
    } catch {
      // Playlist might already exist, continue
    }

    // Update playlist with assets
    await piSignageClient.updatePlaylist(validated.playlistName, {
      assets: validated.assets.map((asset) => ({
        filename: asset.filename,
        duration: asset.duration || 10,
        selected: true,
      })),
    });

    // Deploy to player groups
    const groupIds = new Set<string>();
    for (const playerId of validated.playerIds) {
      const player = playerMap.get(playerId);
      if (player?.group?._id) {
        groupIds.add(player.group._id);
      }
    }

    for (const groupId of groupIds) {
      await piSignageClient.deployToGroup(groupId, {
        deploy: true,
        playlists: [
          {
            name: validated.playlistName,
            settings: {
              durationEnable: true,
              startdate: validated.startTime,
              enddate: validated.endTime,
            },
          },
        ],
        assets: validated.assets.map((a) => a.filename),
      });
    }

    // Save to database
    let schedule = null;
    try {
      // const dbUser = // await prisma.user.findUnique({
        where: { zoUserId: session.user.id },
      });

      if (dbUser) {
        schedule = // await prisma.scheduleHistory.create({
          data: {
            playerIds: validated.playerIds,
            playlistName: validated.playlistName,
            startTime: new Date(validated.startTime),
            endTime: new Date(validated.endTime),
            deployedByUserId: dbUser.id,
            deployedByPhone: session.user.mobile_number,
            status: 'active',
          },
        });

        // Create audit log
        // await prisma.auditLog.create({
          data: {
            userId: dbUser.id,
            phoneNumber: session.user.mobile_number,
            action: 'schedule',
            resourceType: 'schedule',
            resourceId: schedule.id,
            metadata: {
              playlistName: validated.playlistName,
              playerIds: validated.playerIds,
              startTime: validated.startTime,
              endTime: validated.endTime,
            },
            ipAddress: request.headers.get('x-forwarded-for'),
            userAgent: request.headers.get('user-agent'),
          },
        });
      }
    } catch (dbError) {
      console.warn('Failed to save schedule to database:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule created successfully',
      data: schedule || { playlistName: validated.playlistName },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues } },
        { status: 400 }
      );
    }

    console.error('Schedule create API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to create schedule' } },
      { status: 500 }
    );
  }
}

