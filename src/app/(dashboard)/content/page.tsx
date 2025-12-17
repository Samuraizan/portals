'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/header';
import { ContentCard } from '@/components/content/content-card';
import { usePermissions } from '@/hooks/use-permissions';
import { UploadedContent } from '@/types/content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Upload,
  Search,
  FolderOpen,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

type ContentType = 'all' | 'image' | 'video';
type SortBy = 'date_desc' | 'date_asc' | 'name_asc' | 'size_desc';

export default function ContentPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [content, setContent] = useState<UploadedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContentType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date_desc');
  const [deleteTarget, setDeleteTarget] = useState<UploadedContent | null>(null);

  useEffect(() => {
    if (hasPermission('canViewPlayers')) {
      fetchContent();
    } else {
      setIsLoading(false);
    }
  }, [hasPermission]);

  const fetchContent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/content');
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      setContent(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/content/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setContent((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        toast.success('Content deleted successfully');
      } else {
        const data = await response.json();
        toast.error(data.error?.message || 'Failed to delete content');
      }
    } catch {
      toast.error('Failed to delete content');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filter and sort content
  const filteredContent = content
    .filter((item) => {
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'image' && item.mimeType.startsWith('image/')) ||
        (typeFilter === 'video' && item.mimeType.startsWith('video/'));
      const matchesSearch =
        !searchQuery ||
        item.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name_asc':
          return a.originalFilename.localeCompare(b.originalFilename);
        case 'size_desc':
          return Number(b.fileSize) - Number(a.fileSize);
        default:
          return 0;
      }
    });

  // Count by type
  const typeCounts = {
    all: content.length,
    image: content.filter((c) => c.mimeType.startsWith('image/')).length,
    video: content.filter((c) => c.mimeType.startsWith('video/')).length,
  };

  if (!hasPermission('canViewPlayers')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to view content.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Content Library" />

      <div className="flex-1 space-y-6 p-6">
        {/* Type Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as ContentType)}>
            <TabsList>
              <TabsTrigger value="all">All ({typeCounts.all})</TabsTrigger>
              <TabsTrigger value="image">Images ({typeCounts.image})</TabsTrigger>
              <TabsTrigger value="video">Videos ({typeCounts.video})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button onClick={fetchContent} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {hasPermission('canUploadContent') && (
              <Button asChild>
                <Link href="/content/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest First</SelectItem>
              <SelectItem value="date_asc">Oldest First</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="size_desc">Size (Largest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading content</p>
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchContent}>
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        )}

        {/* Content Grid */}
        {!isLoading && !error && (
          <>
            {filteredContent.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No content found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Upload some content to get started'}
                </p>
                {hasPermission('canUploadContent') && (
                  <Button asChild className="mt-4">
                    <Link href="/content/upload">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Content
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredContent.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    onDelete={() => setDeleteTarget(item)}
                    onSchedule={() =>
                      router.push(`/schedule/new?content=${item.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.originalFilename}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

