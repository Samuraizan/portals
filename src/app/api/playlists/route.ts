import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { hasPermission } from '@/lib/rbac/permissions';
import { z } from 'zod';

const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Playlist name is required').max(100),
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

    if (!hasPermission(session.user, 'canViewPlayers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No permission to view playlists' } },
        { status: 403 }
      );
    }

    const playlistsResponse = await piSignageClient.getPlaylists();

    return NextResponse.json({
      success: true,
      data: playlistsResponse.data || [],
    });
  } catch (error) {
    console.error('Playlists GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch playlists' } },
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

    if (!hasPermission(session.user, 'canUploadContent')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No permission to create playlists' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = createPlaylistSchema.parse(body);

    const result = await piSignageClient.createPlaylist(name);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'PISIGNAGE_ERROR', message: result.error || 'Failed to create playlist' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Playlist "${name}" created successfully`,
      data: result.data,
    });
  } catch (error) {
    console.error('Playlists POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.issues[0].message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create playlist' } },
      { status: 500 }
    );
  }
}

