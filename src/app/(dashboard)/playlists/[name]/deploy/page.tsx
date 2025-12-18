'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { usePermissions } from '@/hooks/use-permissions';
import { Player } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Play,
  Monitor,
  Wifi,
  WifiOff,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';

export default function PlaylistDeployPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResults, setDeployResults] = useState<Record<string, 'success' | 'error' | 'pending'>>({});
  const [error, setError] = useState<string | null>(null);

  const playlistName = decodeURIComponent(params.name as string);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/players');
      if (!response.ok) throw new Error('Failed to fetch players');
      const data = await response.json();
      // Sort online players first
      const sortedPlayers = (data.data || []).sort((a: Player, b: Player) => {
        if (a.isConnected && !b.isConnected) return -1;
        if (!a.isConnected && b.isConnected) return 1;
        return a.name.localeCompare(b.name);
      });
      setPlayers(sortedPlayers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (selectedPlayers.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    setIsDeploying(true);
    setDeployResults({});

    // Initialize all selected as pending
    const initialResults: Record<string, 'pending'> = {};
    selectedPlayers.forEach((id) => {
      initialResults[id] = 'pending';
    });
    setDeployResults(initialResults);

    // Deploy to each player
    const results: Record<string, 'success' | 'error'> = {};
    
    for (const playerId of selectedPlayers) {
      try {
        const response = await fetch(`/api/players/${playerId}/playlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlistName }),
        });

        if (response.ok) {
          results[playerId] = 'success';
        } else {
          results[playerId] = 'error';
        }
      } catch {
        results[playerId] = 'error';
      }

      setDeployResults((prev) => ({ ...prev, [playerId]: results[playerId] }));
    }

    setIsDeploying(false);

    const successCount = Object.values(results).filter((r) => r === 'success').length;
    const errorCount = Object.values(results).filter((r) => r === 'error').length;

    if (errorCount === 0) {
      toast.success(`Deployed to ${successCount} player(s) successfully!`);
    } else if (successCount === 0) {
      toast.error('Failed to deploy to all players');
    } else {
      toast.warning(`Deployed to ${successCount} player(s), ${errorCount} failed`);
    }
  };

  const handleSelectAll = (online: boolean) => {
    const filteredPlayers = players.filter((p) => 
      online ? p.isConnected : true
    );
    setSelectedPlayers(filteredPlayers.map((p) => p._id));
  };

  const handleClearSelection = () => {
    setSelectedPlayers([]);
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const onlinePlayers = players.filter((p) => p.isConnected);
  const offlinePlayers = players.filter((p) => !p.isConnected);

  if (!hasPermission('canControlPlayback')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to deploy playlists.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Deploy Playlist" />
        <div className="flex-1 space-y-6 p-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Error</h2>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title={`Deploy: ${playlistName}`} />

      <div className="flex-1 space-y-6 p-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/playlists/${encodeURIComponent(playlistName)}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Playlist
          </Link>
        </Button>

        {/* Playlist Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Deploy &quot;{playlistName}&quot;
            </CardTitle>
            <CardDescription>
              Select players to deploy this playlist to. The playlist will start playing immediately.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Selection Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSelectAll(true)}>
            Select All Online ({onlinePlayers.length})
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSelectAll(false)}>
            Select All ({players.length})
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearSelection}>
            Clear Selection
          </Button>
          <div className="flex-1" />
          <Badge variant="secondary">
            {selectedPlayers.length} selected
          </Badge>
        </div>

        {/* Players Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Online Players */}
          {onlinePlayers.map((player) => (
            <PlayerSelectCard
              key={player._id}
              player={player}
              selected={selectedPlayers.includes(player._id)}
              onToggle={() => togglePlayer(player._id)}
              deployStatus={deployResults[player._id]}
            />
          ))}

          {/* Offline Players */}
          {offlinePlayers.map((player) => (
            <PlayerSelectCard
              key={player._id}
              player={player}
              selected={selectedPlayers.includes(player._id)}
              onToggle={() => togglePlayer(player._id)}
              deployStatus={deployResults[player._id]}
              disabled
            />
          ))}
        </div>

        {/* Deploy Button */}
        <div className="fixed bottom-0 left-64 right-0 border-t bg-background p-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <p className="text-sm text-muted-foreground">
              {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''} selected
            </p>
            <Button
              size="lg"
              onClick={handleDeploy}
              disabled={isDeploying || selectedPlayers.length === 0}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Deploy to {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Spacer for fixed bottom bar */}
        <div className="h-20" />
      </div>
    </div>
  );
}

interface PlayerSelectCardProps {
  player: Player;
  selected: boolean;
  onToggle: () => void;
  deployStatus?: 'success' | 'error' | 'pending';
  disabled?: boolean;
}

function PlayerSelectCard({ player, selected, onToggle, deployStatus, disabled }: PlayerSelectCardProps) {
  const isOnline = player.isConnected;

  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected ? 'ring-2 ring-primary' : ''
      } ${disabled ? 'opacity-60' : 'hover:shadow-md'}`}
      onClick={disabled ? undefined : onToggle}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            disabled={disabled}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium truncate">{player.name}</span>
            </div>
            
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor className="h-3 w-3" />
              <span>{player.group?.name || 'No Group'}</span>
            </div>

            {player.currentPlaylist && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                Playing: {player.currentPlaylist}
              </p>
            )}
          </div>

          {/* Deploy Status */}
          {deployStatus && (
            <div className="flex items-center">
              {deployStatus === 'pending' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {deployStatus === 'success' && (
                <Check className="h-4 w-4 text-green-500" />
              )}
              {deployStatus === 'error' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>

        {disabled && (
          <Badge variant="outline" className="mt-2 text-xs">
            Offline - will apply when online
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

