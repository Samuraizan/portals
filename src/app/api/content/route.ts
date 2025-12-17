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
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canViewPlayers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to view content' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    // Try database first
    let query = supabase
      .from('uploaded_content')
      .select('*', { count: 'exact' });

    if (type === 'image') {
      query = query.ilike('mime_type', 'image/%');
    } else if (type === 'video') {
      query = query.ilike('mime_type', 'video/%');
    }

    if (search) {
      query = query.ilike('original_filename', `%${search}%`);
    }

    const { data: content, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (!error && content) {
      return NextResponse.json({
        success: true,
        data: content,
        pagination: {
          page,
          perPage,
          total: count || 0,
          pages: Math.ceil((count || 0) / perPage),
        },
      });
    }

    // Fallback: fetch from PiSignage directly
    const filesResult = await piSignageClient.getFiles();
    const files = (filesResult.data as Array<{ name: string; size?: string; type?: string }>) || [];

    const formattedContent = files.map((file, index) => ({
      id: `pisignage-${index}`,
      filename: file.name,
      original_filename: file.name,
      file_size: parseInt(file.size?.replace(/[^0-9]/g, '') || '0') * 1024,
      mime_type: file.type === 'video' ? 'video/mp4' : 'image/jpeg',
      storage_url: `${process.env.PISIGNAGE_API_URL?.replace('/api', '')}/media/${file.name}`,
      created_at: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedContent,
    });
  } catch (error) {
    console.error('Content API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to fetch content' } },
      { status: 500 }
    );
  }
}
