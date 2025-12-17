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

    if (!hasPermission(session.user, 'canUploadContent')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to upload content',
          },
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'No file provided',
          },
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_FORMAT',
            message: 'Only .jpg, .png, .mp4, .mov files are allowed',
          },
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size must be under 100MB',
          },
        },
        { status: 400 }
      );
    }

    // Convert file to buffer for upload
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to PiSignage
    const uploadResult = await piSignageClient.uploadFile(buffer, file.name);

    if (!uploadResult.success) {
      throw new Error('Failed to upload to PiSignage');
    }

    // Process the upload
    await piSignageClient.processUpload([
      {
        name: uploadResult.data.name,
        type: uploadResult.data.type,
        size: uploadResult.data.size,
      },
    ]);

    // Generate storage URL
    const storageUrl = `${process.env.PISIGNAGE_API_URL?.replace('/api', '')}/media/${uploadResult.data.name}`;

    // Save to database
    let savedContent = null;
    try {
      // const dbUser = // await prisma.user.findUnique({
        where: { zoUserId: session.user.id },
      });

      if (dbUser) {
        savedContent = // await prisma.uploadedContent.create({
          data: {
            filename: uploadResult.data.name,
            originalFilename: file.name,
            fileSize: BigInt(file.size),
            mimeType: file.type,
            storageUrl,
            uploadedByUserId: dbUser.id,
            uploadedByPhone: session.user.mobile_number,
            pisignageFilename: uploadResult.data.name,
            metadata: title ? { title } : undefined,
          },
        });

        // Create audit log
        // await prisma.auditLog.create({
          data: {
            userId: dbUser.id,
            phoneNumber: session.user.mobile_number,
            action: 'upload',
            resourceType: 'content',
            resourceId: savedContent.id,
            metadata: {
              filename: file.name,
              size: file.size,
              type: file.type,
            },
            ipAddress: request.headers.get('x-forwarded-for'),
            userAgent: request.headers.get('user-agent'),
          },
        });
      }
    } catch (dbError) {
      console.warn('Failed to save to database:', dbError);
    }

    // Return response
    return NextResponse.json({
      success: true,
      data: savedContent || {
        id: `temp-${Date.now()}`,
        filename: uploadResult.data.name,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageUrl,
        pisignageFilename: uploadResult.data.name,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload content',
        },
      },
      { status: 500 }
    );
  }
}

