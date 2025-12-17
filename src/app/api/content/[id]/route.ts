import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { supabase } from '@/lib/db/client';
import { hasPermission } from '@/lib/rbac/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canViewPlayers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { data: content, error } = await supabase
      .from('uploaded_content')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !content) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    console.error('Content API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch content' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canDeleteContent')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to delete content' } },
        { status: 403 }
      );
    }

    // Get content from database
    const { data: content, error: fetchError } = await supabase
      .from('uploaded_content')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !content) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } },
        { status: 404 }
      );
    }

    // Delete from PiSignage
    if (content.pisignage_filename) {
      try {
        await piSignageClient.deleteFile(content.pisignage_filename);
      } catch {
        // Continue even if PiSignage delete fails
      }
    }

    // Delete from database
    await supabase.from('uploaded_content').delete().eq('id', id);

    return NextResponse.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Delete content API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete content' } },
      { status: 500 }
    );
  }
}
