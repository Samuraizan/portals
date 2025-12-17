'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/hooks/use-permissions';
import { Player } from '@/types/player';
import { formatRelativeTime, determinePlayerStatus, cn } from '@/lib/utils';
import {
  ArrowLeft,
  Monitor,
  MapPin,
  Wifi,
  WifiOff,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Calendar,
  Clock,
  HardDrive,
  Network,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission, canAccessPlayer } = usePermissions();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playlists, setPlaylists] = useState<string[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isControlling, setIsControlling] = useState(false);

  const playerId = params.id as string;

  useEffect(() => {
    const loadData = async () => {
      if (hasPermission('canViewPlayers')) {
        await fetchPlayer();
        await fetchPlaylists();
      } else {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const fetchPlayer = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}`);
      if (!response.ok) throw new Error('Failed to fetch player');
      const data = await response.json();
      
      const playerData = {
        ...data.data,
        status: determinePlayerStatus(data.data.lastReported, data.data.playlistOn),
      };
      
      setPlayer(playerData);
      
      // Check access
      if (!canAccessPlayer(playerData._id, playerData.name)) {
        setError('You do not have access to this player');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('/api/playlists');
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.data?.map((p: { name: string }) => p.name) || []);
      }
    } catch {
      // Ignore playlist fetch errors
    }
  };

  const handleControl = async (action: 'pause' | 'forward' | 'backward') => {
    if (!hasPermission('canControlPlayback')) {
      toast.error('You do not have permission to control playback');
      return;
    }

    setIsControlling(true);
    try {
      const response = await fetch(`/api/players/${playerId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(`Playback ${action === 'pause' ? 'paused' : action}`);
        await fetchPlayer();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || 'Failed to control playback');
      }
    } catch {
      toast.error('Failed to control playback');
    } finally {
      setIsControlling(false);
    }
  };

  const handleSetPlaylist = async () => {
    if (!selectedPlaylist) return;
    if (!hasPermission('canControlPlayback')) {
      toast.error('You do not have permission to change playlists');
      return;
    }

    setIsControlling(true);
    try {
      const response = await fetch(`/api/players/${playerId}/playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistName: selectedPlaylist }),
      });

      if (response.ok) {
        toast.success(`Playlist changed to "${selectedPlaylist}"`);
        await fetchPlayer();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || 'Failed to set playlist');
      }
    } catch {
      toast.error('Failed to set playlist');
    } finally {
      setIsControlling(false);
    }
  };

  if (!hasPermission('canViewPlayers')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to view players.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Player Details" />
        <div className="flex-1 space-y-6 p-6">
          <Skeleton className="h-10 w-32" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Error</h2>
        <p className="mt-2 text-muted-foreground">{error || 'Player not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const status = player.status || 'offline';
  const statusConfig = {
    online: { label: 'Online', color: 'bg-green-500', textColor: 'text-green-600' },
    idle: { label: 'Idle', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    offline: { label: 'Offline', color: 'bg-red-500', textColor: 'text-red-600' },
  };
  const { label: statusLabel, color: statusColor, textColor } = statusConfig[status];

  return (
    <div className="flex flex-col">
      <Header title={player.name} />

      <div className="flex-1 space-y-6 p-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/players">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Players
          </Link>
        </Button>

        {/* Player Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                status === 'online' ? 'bg-green-100' : status === 'idle' ? 'bg-yellow-100' : 'bg-red-100'
              )}
            >
              {status === 'offline' ? (
                <WifiOff className={cn('h-6 w-6', textColor)} />
              ) : (
                <Wifi className={cn('h-6 w-6', textColor)} />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{player.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className={cn('h-2 w-2 rounded-full', statusColor)} />
                <span>{statusLabel}</span>
                <span>•</span>
                <span>{player.group?.name}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchPlayer} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button asChild>
              <Link href={`/schedule/new?player=${player._id}`}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Content
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Player Info */}
          <Card>
            <CardHeader>
              <CardTitle>Player Information</CardTitle>
              <CardDescription>Technical details about this display</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{player.configLocation || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Resolution</p>
                    <p className="font-medium">1920 × 1080</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Network className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="font-medium">{player.myIpAddress || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Serial Number</p>
                    <p className="font-mono text-sm">{player.cpuSerialNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Seen</p>
                    <p className="font-medium">{formatRelativeTime(player.lastReported)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="font-medium">{player.version || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Playback */}
          <Card>
            <CardHeader>
              <CardTitle>Current Playback</CardTitle>
              <CardDescription>What&apos;s playing now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center gap-2">
                  {player.playlistOn ? (
                    <Play className="h-5 w-5 text-green-500" />
                  ) : (
                    <Pause className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Current Playlist</p>
                    <p className="text-lg font-medium">
                      {player.currentPlaylist || 'No playlist'}
                    </p>
                  </div>
                </div>
                <Badge variant={player.playlistOn ? 'default' : 'secondary'} className="mt-2">
                  {player.playlistOn ? 'Playing' : 'Paused'}
                </Badge>
              </div>

              {/* Playback Controls */}
              {hasPermission('canControlPlayback') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleControl('backward')}
                      disabled={isControlling || status === 'offline'}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => handleControl('pause')}
                      disabled={isControlling || status === 'offline'}
                    >
                      {player.playlistOn ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleControl('forward')}
                      disabled={isControlling || status === 'offline'}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Change Playlist */}
                  <div className="flex gap-2">
                    <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select playlist..." />
                      </SelectTrigger>
                      <SelectContent>
                        {playlists.map((playlist) => (
                          <SelectItem key={playlist} value={playlist}>
                            {playlist}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleSetPlaylist}
                      disabled={!selectedPlaylist || isControlling || status === 'offline'}
                    >
                      Play Now
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

