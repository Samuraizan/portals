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

    // const content = // await prisma.uploadedContent.findUnique({
      where: { id },
    });

    if (!content) {
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
    // const content = // await prisma.uploadedContent.findUnique({
      where: { id },
    });

    if (!content) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } },
        { status: 404 }
      );
    }

    // Delete from PiSignage
    if (content.pisignageFilename) {
      try {
        await piSignageClient.deleteAsset(content.pisignageFilename);
      } catch (piError) {
        console.warn('Failed to delete from PiSignage:', piError);
      }
    }

    // Delete from database
    // await prisma.uploadedContent.delete({
      where: { id },
    });

    // Create audit log
    try {
      // const dbUser = // await prisma.user.findUnique({
        where: { zoUserId: session.user.id },
      });

      if (dbUser) {
        // await prisma.auditLog.create({
          data: {
            userId: dbUser.id,
            phoneNumber: session.user.mobile_number,
            action: 'delete',
            resourceType: 'content',
            resourceId: id,
            metadata: { filename: content.originalFilename },
            ipAddress: request.headers.get('x-forwarded-for'),
            userAgent: request.headers.get('user-agent'),
          },
        });
      }
    } catch (dbError) {
      console.warn('Failed to create audit log:', dbError);
    }

    return NextResponse.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Delete content API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete content' } },
      { status: 500 }
    );
  }
}

