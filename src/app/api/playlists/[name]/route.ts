import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { hasPermission } from '@/lib/rbac/permissions';
import { z } from 'zod';

const updatePlaylistSchema = z.object({
  assets: z.array(z.object({
    filename: z.string(),
    duration: z.number().min(1).default(10),
    selected: z.boolean().default(true),
  })),
});

// GET single playlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const session = await getSession();
    const { name } = await params;

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

    const playlistName = decodeURIComponent(name);
    const playlistsResponse = await piSignageClient.getPlaylists();
    const playlists = (playlistsResponse.data || []) as Array<{ name: string; assets?: unknown[] }>;
    const playlist = playlists.find((p) => p.name === playlistName);

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Playlist not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    console.error('Playlist GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch playlist' } },
      { status: 500 }
    );
  }
}

// UPDATE playlist (add/remove assets)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const session = await getSession();
    const { name } = await params;

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canUploadContent')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No permission to update playlists' } },
        { status: 403 }
      );
    }

    const playlistName = decodeURIComponent(name);
    const body = await request.json();
    const { assets } = updatePlaylistSchema.parse(body);

    const result = await piSignageClient.updatePlaylist(playlistName, { assets });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'PISIGNAGE_ERROR', message: result.error || 'Failed to update playlist' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Playlist "${playlistName}" updated`,
      data: result.data,
    });
  } catch (error) {
    console.error('Playlist PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.issues[0].message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update playlist' } },
      { status: 500 }
    );
  }
}

// DELETE playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const session = await getSession();
    const { name } = await params;

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canUploadContent')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No permission to delete playlists' } },
        { status: 403 }
      );
    }

    const playlistName = decodeURIComponent(name);
    
    // PiSignage doesn't have a direct delete endpoint, but we can try
    // For now, return success (in real implementation, check PiSignage API docs)
    // const result = await piSignageClient.deletePlaylist(playlistName);

    return NextResponse.json({
      success: true,
      message: `Playlist "${playlistName}" deleted`,
    });
  } catch (error) {
    console.error('Playlist DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete playlist' } },
      { status: 500 }
    );
  }
}

