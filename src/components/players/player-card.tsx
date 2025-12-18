'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Player } from '@/types/player';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Monitor, MapPin, Play, Pause, Calendar, Clock } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onSchedule?: () => void;
}

export function PlayerCard({ player, onSchedule }: PlayerCardProps) {
  // Use isConnected from PiSignage as source of truth, fallback to status field
  const isOnline = player.isConnected === true;
  const status = player.status || (isOnline ? (player.playlistOn ? 'online' : 'idle') : 'offline');
  
  const statusConfig = {
    online: {
      label: 'Online',
      color: 'bg-green-500',
      badgeVariant: 'default' as const,
    },
    idle: {
      label: 'Idle',
      color: 'bg-yellow-500',
      badgeVariant: 'secondary' as const,
    },
    offline: {
      label: 'Offline',
      color: 'bg-red-500',
      badgeVariant: 'destructive' as const,
    },
  };

  const { label, color, badgeVariant } = statusConfig[status];

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                color,
                status === 'online' && 'animate-pulse-subtle'
              )}
            />
            <h3 className="font-semibold leading-tight">{player.name}</h3>
          </div>
          <Badge variant={badgeVariant} className="text-xs">
            {label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-2">
        {/* Location */}
        {player.configLocation && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{player.configLocation}</span>
          </div>
        )}

        {/* Display Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Monitor className="h-4 w-4" />
          <span>1920×1080</span>
          <span className="text-xs">•</span>
          <span>{player.group?.name || 'No Group'}</span>
        </div>

        {/* Current Playlist */}
        {player.currentPlaylist && (
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Currently Playing</p>
            <div className="mt-1 flex items-center gap-2">
              {player.playlistOn ? (
                <Play className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Pause className="h-3.5 w-3.5 text-yellow-500" />
              )}
              <span className="truncate text-sm font-medium">
                {player.currentPlaylist}
              </span>
            </div>
          </div>
        )}

        {/* Last Seen */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Last seen {formatRelativeTime(player.lastReported)}</span>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/players/${player._id}`}>View Details</Link>
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={onSchedule}
          asChild
        >
          <Link href={`/schedule/new?player=${player._id}`}>
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Schedule
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

