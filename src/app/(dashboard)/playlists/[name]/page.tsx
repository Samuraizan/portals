'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { usePermissions } from '@/hooks/use-permissions';
import { Playlist, PlaylistAsset } from '@/types/playlist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Image,
  Film,
  Clock,
  GripVertical,
  AlertCircle,
  RefreshCw,
  Play,
} from 'lucide-react';

interface AvailableFile {
  name: string;
  size?: string;
  type?: string;
}

export default function PlaylistEditPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [availableFiles, setAvailableFiles] = useState<AvailableFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedFilesToAdd, setSelectedFilesToAdd] = useState<string[]>([]);

  const playlistName = decodeURIComponent(params.name as string);

  useEffect(() => {
    fetchPlaylist();
    fetchAvailableFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistName]);

  const fetchPlaylist = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/playlists/${encodeURIComponent(playlistName)}`);
      if (!response.ok) throw new Error('Failed to fetch playlist');
      const data = await response.json();
      setPlaylist(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableFiles = async () => {
    try {
      const response = await fetch('/api/content');
      if (response.ok) {
        const data = await response.json();
        // Map content to file format
        const files = (data.data || []).map((item: { filename?: string; original_filename?: string; mime_type?: string; file_size?: number }) => ({
          name: item.filename || item.original_filename,
          type: item.mime_type?.startsWith('video/') ? 'video' : 'image',
          size: item.file_size,
        }));
        setAvailableFiles(files);
      }
    } catch {
      // Ignore errors, files are optional
    }
  };

  const handleSave = async () => {
    if (!playlist) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/playlists/${encodeURIComponent(playlistName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: playlist.assets }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Playlist saved successfully');
        setHasChanges(false);
      } else {
        toast.error(data.error?.message || 'Failed to save playlist');
      }
    } catch {
      toast.error('Failed to save playlist');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAssets = () => {
    if (!playlist || selectedFilesToAdd.length === 0) return;

    const newAssets: PlaylistAsset[] = selectedFilesToAdd.map((filename) => ({
      filename,
      duration: 10,
      selected: true,
    }));

    setPlaylist({
      ...playlist,
      assets: [...(playlist.assets || []), ...newAssets],
    });
    setSelectedFilesToAdd([]);
    setHasChanges(true);
    toast.success(`Added ${newAssets.length} asset(s) to playlist`);
  };

  const handleRemoveAsset = (index: number) => {
    if (!playlist) return;

    const newAssets = [...playlist.assets];
    newAssets.splice(index, 1);
    setPlaylist({ ...playlist, assets: newAssets });
    setHasChanges(true);
  };

  const handleUpdateDuration = (index: number, duration: number) => {
    if (!playlist) return;

    const newAssets = [...playlist.assets];
    newAssets[index] = { ...newAssets[index], duration };
    setPlaylist({ ...playlist, assets: newAssets });
    setHasChanges(true);
  };

  const handleToggleSelected = (index: number) => {
    if (!playlist) return;

    const newAssets = [...playlist.assets];
    newAssets[index] = { ...newAssets[index], selected: !newAssets[index].selected };
    setPlaylist({ ...playlist, assets: newAssets });
    setHasChanges(true);
  };

  const getFileIcon = (filename: string) => {
    if (filename.match(/\.(mp4|mov|webm|avi)$/i)) {
      return <Film className="h-4 w-4 text-blue-500" />;
    }
    return <Image className="h-4 w-4 text-green-500" />;
  };

  // Files not already in the playlist
  const availableToAdd = availableFiles.filter(
    (file) => !playlist?.assets?.some((asset) => asset.filename === file.name)
  );

  if (!hasPermission('canViewPlayers')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to view playlists.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Edit Playlist" />
        <div className="flex-1 space-y-6 p-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Error</h2>
        <p className="mt-2 text-muted-foreground">{error || 'Playlist not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const totalDuration = playlist.assets?.reduce((acc, asset) => 
    asset.selected ? acc + asset.duration : acc, 0
  ) || 0;

  return (
    <div className="flex flex-col">
      <Header title={`Edit: ${playlistName}`} />

      <div className="flex-1 space-y-6 p-6">
        {/* Back and Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/playlists">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Playlists
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchPlaylist}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href={`/playlists/${encodeURIComponent(playlistName)}/deploy`}>
                <Play className="mr-2 h-4 w-4" />
                Deploy
              </Link>
            </Button>
            {hasPermission('canUploadContent') && (
              <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>

        {/* Playlist Info */}
        <Card>
          <CardHeader>
            <CardTitle>{playlistName}</CardTitle>
            <CardDescription>
              {playlist.assets?.length || 0} assets • {Math.floor(totalDuration / 60)}m {totalDuration % 60}s total duration
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Assets List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Playlist Assets</CardTitle>
                <CardDescription>
                  Drag to reorder, adjust duration for each asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(!playlist.assets || playlist.assets.length === 0) ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
                    <Image className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No assets in this playlist yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add assets from the panel on the right
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playlist.assets.map((asset, index) => (
                      <div
                        key={`${asset.filename}-${index}`}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          !asset.selected ? 'opacity-50' : ''
                        }`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        
                        <Checkbox
                          checked={asset.selected}
                          onCheckedChange={() => handleToggleSelected(index)}
                        />

                        {getFileIcon(asset.filename)}

                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{asset.filename}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min={1}
                            max={300}
                            value={asset.duration}
                            onChange={(e) => handleUpdateDuration(index, parseInt(e.target.value) || 10)}
                            className="w-16 h-8 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">sec</span>
                        </div>

                        {hasPermission('canUploadContent') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveAsset(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Assets Panel */}
          {hasPermission('canUploadContent') && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Assets</CardTitle>
                  <CardDescription>
                    Select files to add to this playlist
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {availableToAdd.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        No more assets available
                      </p>
                      <Button variant="link" size="sm" asChild>
                        <Link href="/content/upload">Upload new content</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {availableToAdd.map((file) => (
                          <label
                            key={file.name}
                            className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={selectedFilesToAdd.includes(file.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedFilesToAdd([...selectedFilesToAdd, file.name]);
                                } else {
                                  setSelectedFilesToAdd(selectedFilesToAdd.filter((f) => f !== file.name));
                                }
                              }}
                            />
                            {file.type === 'video' ? (
                              <Film className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Image className="h-4 w-4 text-green-500" />
                            )}
                            <span className="truncate text-sm">{file.name}</span>
                          </label>
                        ))}
                      </div>

                      <Button
                        onClick={handleAddAssets}
                        disabled={selectedFilesToAdd.length === 0}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add {selectedFilesToAdd.length || ''} Asset{selectedFilesToAdd.length !== 1 ? 's' : ''}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Set duration in seconds for each asset</li>
                    <li>• Uncheck assets to skip them temporarily</li>
                    <li>• Use Deploy to push changes to players</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Unsaved Changes Warning */}
        {hasChanges && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-yellow-100 dark:bg-yellow-900 px-4 py-2 shadow-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              You have unsaved changes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

