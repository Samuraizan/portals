'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatFileSize, formatDuration, formatRelativeTime } from '@/lib/utils';
import { UploadedContent } from '@/types/content';
import {
  Play,
  Calendar,
  MoreVertical,
  Trash2,
  Edit,
  Download,
  Eye,
  FileVideo,
  FileImage,
} from 'lucide-react';

interface ContentCardProps {
  content: UploadedContent;
  onDelete?: () => void;
  onSchedule?: () => void;
}

export function ContentCard({ content, onDelete, onSchedule }: ContentCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const isVideo = content.mimeType.startsWith('video/');
  const isImage = content.mimeType.startsWith('image/');

  return (
    <>
      <Card className="group overflow-hidden">
        {/* Thumbnail */}
        <div
          className="relative aspect-video cursor-pointer bg-muted"
          onClick={() => setShowPreview(true)}
        >
          {content.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.thumbnailUrl}
              alt={content.metadata?.title || content.originalFilename}
              className="h-full w-full object-cover"
            />
          ) : isVideo ? (
            <div className="flex h-full items-center justify-center">
              <FileVideo className="h-16 w-16 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileImage className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="secondary" size="icon">
              {isVideo ? <Play className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
          </div>

          {/* Duration badge */}
          {content.duration && (
            <Badge variant="secondary" className="absolute bottom-2 right-2">
              {formatDuration(content.duration)}
            </Badge>
          )}

          {/* Type badge */}
          <Badge
            variant="outline"
            className="absolute left-2 top-2 bg-background/80"
          >
            {isVideo ? 'Video' : 'Image'}
          </Badge>
        </div>

        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium">
                {content.metadata?.title || content.originalFilename}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(Number(content.fileSize))} •{' '}
                {formatRelativeTime(new Date(content.createdAt))}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPreview(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSchedule}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={content.storageUrl} download target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>

        <CardFooter className="gap-2 border-t p-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Preview
          </Button>
          <Button size="sm" className="flex-1" onClick={onSchedule}>
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Schedule
          </Button>
        </CardFooter>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {content.metadata?.title || content.originalFilename}
            </DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-black">
            {isVideo ? (
              <video
                src={content.storageUrl}
                controls
                className="h-full w-full"
                autoPlay
              />
            ) : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.storageUrl}
                alt={content.metadata?.title || content.originalFilename}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white">
                Preview not available
              </div>
            )}
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span>{formatFileSize(Number(content.fileSize))}</span>
            </div>
            {content.resolution && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution</span>
                <span>
                  {content.resolution.width} × {content.resolution.height}
                </span>
              </div>
            )}
            {content.duration && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{formatDuration(content.duration)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded</span>
              <span>{new Date(content.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

