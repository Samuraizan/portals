import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { supabase } from '@/lib/db/client';
import { hasPermission } from '@/lib/rbac/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

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
            message: 'You do not have permission to view content',
          },
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (type === 'image') {
      where.mimeType = { startsWith: 'image/' };
    } else if (type === 'video') {
      where.mimeType = { startsWith: 'video/' };
    }

    if (search) {
      where.OR = [
        { originalFilename: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['title'], string_contains: search } },
      ];
    }

    // Try to get from database first
    try {
      const [content, total] = await Promise.all([
        prisma.uploadedContent.findMany({
          where,
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.uploadedContent.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: content,
        pagination: {
          page,
          perPage,
          total,
          pages: Math.ceil(total / perPage),
        },
      });
    } catch {
      // If database not available, try PiSignage directly
      const assets = await piSignageClient.getAssets();

      const content = assets.data?.dbdata?.map((asset, index) => ({
        id: `pisignage-${index}`,
        filename: asset.name,
        originalFilename: asset.name,
        fileSize: parseInt(asset.size?.replace(/[^0-9]/g, '') || '0') * 1024 * 1024,
        mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        duration: asset.duration ? parseInt(asset.duration) : undefined,
        resolution: asset.resolution
          ? {
              width: parseInt(asset.resolution.width),
              height: parseInt(asset.resolution.height),
            }
          : undefined,
        storageUrl: `${process.env.PISIGNAGE_API_URL?.replace('/api', '')}/media/${asset.name}`,
        thumbnailUrl: asset.thumbnail
          ? `${process.env.PISIGNAGE_API_URL?.replace('/api', '')}${asset.thumbnail}`
          : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })) || [];

      return NextResponse.json({
        success: true,
        data: content,
      });
    }
  } catch (error) {
    console.error('Content API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch content',
        },
      },
      { status: 500 }
    );
  }
}

