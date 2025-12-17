'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { ContentUploader } from '@/components/content/content-uploader';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function ContentUploadPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const handleUploadComplete = () => {
    // Could redirect or update state
  };

  if (!hasPermission('canUploadContent')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to upload content.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Upload Content" />

      <div className="flex-1 space-y-6 p-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/content">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>

        {/* Upload Section */}
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Upload Content</h2>
            <p className="text-muted-foreground">
              Upload images and videos to display on your portals
            </p>
          </div>

          <ContentUploader onUploadComplete={handleUploadComplete} />

          {/* Tips */}
          <div className="mt-8 rounded-lg bg-muted p-4">
            <h3 className="font-medium">Upload Tips</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Recommended resolution: 1920 × 1080 (Full HD)</li>
              <li>• Supported formats: .jpg, .png, .mp4, .mov</li>
              <li>• Maximum file size: 100MB per file</li>
              <li>• For best quality, use MP4 with H.264 codec for videos</li>
              <li>• Keep videos under 60 seconds for optimal loading</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

