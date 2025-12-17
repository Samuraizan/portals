import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { supabase } from '@/lib/db/client';
import { hasPermission, canAccessPlayer } from '@/lib/rbac/permissions';
import { z } from 'zod';

const createScheduleSchema = z.object({
  playlistName: z.string().min(1),
  playerIds: z.array(z.string()).min(1),
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

    const { data: schedules } = await supabase
      .from('schedule_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    return NextResponse.json({
      success: true,
      data: schedules || [],
    });
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
    const players = playersResponse?.data?.objects || [];
    const playerMap = new Map(players.map((p: { _id: string; name: string }) => [p._id, p]));

    for (const playerId of validated.playerIds) {
      const player = playerMap.get(playerId) as { _id: string; name: string } | undefined;
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

    // Save to database
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('zo_user_id', session.user.id)
      .single();

    let schedule = null;
    if (dbUser) {
      const { data } = await supabase
        .from('schedule_history')
        .insert({
          player_ids: validated.playerIds,
          playlist_name: validated.playlistName,
          start_time: validated.startTime,
          end_time: validated.endTime,
          deployed_by_user_id: dbUser.id,
          deployed_by_phone: session.user.mobile_number,
          status: 'scheduled',
        })
        .select()
        .single();
      
      schedule = data;
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
