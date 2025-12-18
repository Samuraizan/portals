'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { usePermissions } from '@/hooks/use-permissions';
import { Playlist } from '@/types/playlist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ListVideo,
  Plus,
  RefreshCw,
  AlertCircle,
  Search,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  Image,
  Film,
  Copy,
} from 'lucide-react';

export default function PlaylistsPage() {
  const { hasPermission, role } = usePermissions();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (hasPermission('canViewPlayers')) {
      fetchPlaylists();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/playlists');
      if (!response.ok) throw new Error('Failed to fetch playlists');
      const data = await response.json();
      setPlaylists(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Playlist "${newPlaylistName}" created`);
        setNewPlaylistName('');
        setIsCreateOpen(false);
        fetchPlaylists();
      } else {
        toast.error(data.error?.message || 'Failed to create playlist');
      }
    } catch {
      toast.error('Failed to create playlist');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistName: string) => {
    if (!confirm(`Are you sure you want to delete "${playlistName}"?`)) return;

    try {
      const response = await fetch(`/api/playlists/${encodeURIComponent(playlistName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`Playlist "${playlistName}" deleted`);
        fetchPlaylists();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || 'Failed to delete playlist');
      }
    } catch {
      toast.error('Failed to delete playlist');
    }
  };

  // Filter playlists
  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count assets
  const getAssetCounts = (playlist: Playlist) => {
    const images = playlist.assets?.filter((a) => 
      a.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    ).length || 0;
    const videos = playlist.assets?.filter((a) => 
      a.filename.match(/\.(mp4|mov|webm|avi)$/i)
    ).length || 0;
    return { images, videos, total: playlist.assets?.length || 0 };
  };

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

  return (
    <div className="flex flex-col">
      <Header title="Playlists" />

      <div className="flex-1 space-y-6 p-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchPlaylists} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {hasPermission('canUploadContent') && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Playlist
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Playlist</DialogTitle>
                    <DialogDescription>
                      Create a new playlist to organize your content
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="playlist-name">Playlist Name</Label>
                      <Input
                        id="playlist-name"
                        placeholder="e.g., Lobby Display, Event Promo"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePlaylist} disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create Playlist'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{playlists.length} playlists</span>
          <span>•</span>
          <span>{playlists.reduce((acc, p) => acc + (p.assets?.length || 0), 0)} total assets</span>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading playlists</p>
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchPlaylists}>
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        )}

        {/* Playlists Grid */}
        {!isLoading && !error && (
          <>
            {filteredPlaylists.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <ListVideo className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  {searchQuery ? 'No playlists found' : 'No playlists yet'}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Create your first playlist to get started'}
                </p>
                {!searchQuery && hasPermission('canUploadContent') && (
                  <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Playlist
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPlaylists.map((playlist) => {
                  const counts = getAssetCounts(playlist);
                  return (
                    <Card key={playlist.name} className="group relative overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="truncate text-lg">
                              {playlist.name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {counts.total} asset{counts.total !== 1 ? 's' : ''}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/playlists/${encodeURIComponent(playlist.name)}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Playlist
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/playlists/${encodeURIComponent(playlist.name)}/deploy`}>
                                  <Play className="mr-2 h-4 w-4" />
                                  Deploy to Players
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(playlist.name);
                                  toast.success('Playlist name copied');
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Name
                              </DropdownMenuItem>
                              {hasPermission('canUploadContent') && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeletePlaylist(playlist.name)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Asset Preview */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {counts.images > 0 && (
                            <div className="flex items-center gap-1">
                              <Image className="h-4 w-4" />
                              <span>{counts.images}</span>
                            </div>
                          )}
                          {counts.videos > 0 && (
                            <div className="flex items-center gap-1">
                              <Film className="h-4 w-4" />
                              <span>{counts.videos}</span>
                            </div>
                          )}
                          {counts.total === 0 && (
                            <Badge variant="outline">Empty</Badge>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/playlists/${encodeURIComponent(playlist.name)}`}>
                              <Edit className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </Button>
                          <Button size="sm" className="flex-1" asChild>
                            <Link href={`/playlists/${encodeURIComponent(playlist.name)}/deploy`}>
                              <Play className="mr-1.5 h-3.5 w-3.5" />
                              Deploy
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

