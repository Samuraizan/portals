export interface ContentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface ContentResolution {
  width: number;
  height: number;
}

export interface UploadedContent {
  id: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  resolution?: ContentResolution;
  storageUrl: string;
  thumbnailUrl?: string;
  uploadedByUserId: string;
  uploadedByPhone: string;
  metadata?: ContentMetadata;
  pisignageFilename?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PiSignageAsset {
  name: string;
  type: 'video' | 'image' | 'audio' | 'html' | 'link';
  size: string;
  duration?: string;
  thumbnail?: string;
  resolution?: {
    width: string;
    height: string;
  };
}

export interface PiSignageFileUploadResponse {
  success: boolean;
  stat_message: string;
  data: {
    name: string;
    size: number;
    type: string;
  };
}

export interface PiSignageFilesResponse {
  success: boolean;
  data: {
    files: string[];
    dbdata: PiSignageAsset[];
  };
}

export type ContentType = 'all' | 'image' | 'video';
export type ContentSortBy = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';

