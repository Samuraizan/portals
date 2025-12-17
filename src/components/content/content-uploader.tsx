'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Upload,
  X,
  FileVideo,
  FileImage,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ContentUploaderProps {
  onUploadComplete?: (file: UploadedFile) => void;
}

interface UploadedFile {
  id: string;
  filename: string;
  originalFilename: string;
  size: number;
  type: string;
}

interface FileToUpload {
  file: File;
  preview?: string;
  title?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function ContentUploader({ onUploadComplete }: ContentUploaderProps) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileToUpload[] = acceptedFiles
      .filter((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`"${file.name}" has an unsupported format`);
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`"${file.name}" exceeds the 100MB size limit`);
          return false;
        }
        return true;
      })
      .map((file) => ({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        title: file.name.replace(/\.[^/.]+$/, ''),
        progress: 0,
        status: 'pending' as const,
      }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFileTitle = (index: number, title: string) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], title };
      return newFiles;
    });
  };

  const uploadFile = async (fileToUpload: FileToUpload, index: number) => {
    const formData = new FormData();
    formData.append('file', fileToUpload.file);
    formData.append('title', fileToUpload.title || fileToUpload.file.name);

    try {
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = { ...newFiles[index], status: 'uploading' };
        return newFiles;
      });

      const response = await fetch('/api/content/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[index] = { ...newFiles[index], status: 'complete', progress: 100 };
          return newFiles;
        });
        
        onUploadComplete?.(data.data);
        toast.success(`"${fileToUpload.file.name}" uploaded successfully`);
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (error) {
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        };
        return newFiles;
      });
      toast.error(`Failed to upload "${fileToUpload.file.name}"`);
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }

    setIsUploading(false);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">
          {isDragActive ? 'Drop files here' : 'Drag files here or click to browse'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Supported formats: .jpg, .png, .mp4, .mov (max 100MB)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Files to Upload ({files.length})
            </h3>
            <Button
              onClick={handleUploadAll}
              disabled={isUploading || pendingCount === 0}
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingCount} File${pendingCount !== 1 ? 's' : ''}`}
            </Button>
          </div>

          <div className="space-y-3">
            {files.map((fileToUpload, index) => (
              <div
                key={`${fileToUpload.file.name}-${index}`}
                className={cn(
                  'relative rounded-lg border p-4',
                  fileToUpload.status === 'complete' && 'border-green-500 bg-green-50',
                  fileToUpload.status === 'error' && 'border-red-500 bg-red-50'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Preview/Icon */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                    {fileToUpload.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fileToUpload.preview}
                        alt=""
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : fileToUpload.file.type.startsWith('video/') ? (
                      <FileVideo className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <FileImage className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{fileToUpload.file.name}</p>
                      {fileToUpload.status === 'complete' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {fileToUpload.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(fileToUpload.file.size)}
                    </p>
                    
                    {/* Title Input */}
                    {fileToUpload.status === 'pending' && (
                      <div className="mt-2">
                        <Label htmlFor={`title-${index}`} className="sr-only">
                          Title
                        </Label>
                        <Input
                          id={`title-${index}`}
                          placeholder="Content title (optional)"
                          value={fileToUpload.title}
                          onChange={(e) => updateFileTitle(index, e.target.value)}
                          className="h-8"
                        />
                      </div>
                    )}

                    {/* Progress */}
                    {fileToUpload.status === 'uploading' && (
                      <Progress value={fileToUpload.progress} className="mt-2 h-1" />
                    )}

                    {/* Error */}
                    {fileToUpload.status === 'error' && (
                      <p className="mt-1 text-sm text-red-500">{fileToUpload.error}</p>
                    )}
                  </div>

                  {/* Remove button */}
                  {fileToUpload.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

