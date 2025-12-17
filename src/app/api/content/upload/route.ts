import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { piSignageClient } from '@/lib/pisignage-api/client';
import { supabase } from '@/lib/db/client';
import { hasPermission } from '@/lib/rbac/permissions';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to upload content' } },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'No file provided' } },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_FORMAT', message: 'Only .jpg, .png, .mp4, .mov files are allowed' } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File size must be under 100MB' } },
        { status: 400 }
      );
    }

    // Upload to PiSignage
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    const uploadResult = await piSignageClient.uploadFile(uploadFormData);

    if (!uploadResult.success) {
      throw new Error('Failed to upload to PiSignage');
    }

    const storageUrl = `${process.env.PISIGNAGE_API_URL?.replace('/api', '')}/media/${uploadResult.data?.name || file.name}`;

    // Save to database
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('zo_user_id', session.user.id)
      .single();

    let savedContent = null;
    if (dbUser) {
      const { data } = await supabase
        .from('uploaded_content')
        .insert({
          filename: uploadResult.data?.name || file.name,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_url: storageUrl,
          uploaded_by_user_id: dbUser.id,
          uploaded_by_phone: session.user.mobile_number,
          pisignage_filename: uploadResult.data?.name || file.name,
          metadata: title ? { title } : null,
        })
        .select()
        .single();
      
      savedContent = data;
    }

    return NextResponse.json({
      success: true,
      data: savedContent || {
        id: `temp-${Date.now()}`,
        filename: uploadResult.data?.name || file.name,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageUrl,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_FAILED', message: error instanceof Error ? error.message : 'Failed to upload content' } },
      { status: 500 }
    );
  }
}
