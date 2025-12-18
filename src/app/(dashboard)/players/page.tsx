'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { PlayerCard } from '@/components/players/player-card';
import { usePermissions } from '@/hooks/use-permissions';
import { Player } from '@/types/player';
import { Monitor, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PlayersPage() {
  const { hasPermission, role } = usePermissions();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const canView = hasPermission('canViewPlayers');
    
    if (canView) {
      fetchPlayers();
    } else {
      setError('You do not have permission to view players');
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]); // Fixed: only depend on role, not hasPermission function

  const fetchPlayers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/players');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to fetch players');
      }
      const data = await response.json();
      setPlayers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setIsLoading(false);
    }
  };

  // Status priority for sorting (online first, then idle, then offline)
  const statusPriority: Record<string, number> = {
    online: 0,
    idle: 1,
    offline: 2,
  };

  // Filter and sort players (online first, then offline)
  const filteredPlayers = players
    .filter((player) => {
      const matchesLocation =
        locationFilter === 'all' ||
        player.configLocation?.toLowerCase().includes(locationFilter.toLowerCase());
      const matchesStatus = statusFilter === 'all' || player.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.configLocation?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLocation && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by status priority first (online → idle → offline)
      const priorityA = statusPriority[a.status] ?? 2;
      const priorityB = statusPriority[b.status] ?? 2;
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

  // Get unique locations
  const locations = [...new Set(players.map((p) => p.configLocation).filter(Boolean))];

  // Count by status
  const statusCounts = {
    all: players.length,
    online: players.filter((p) => p.status === 'online').length,
    idle: players.filter((p) => p.status === 'idle').length,
    offline: players.filter((p) => p.status === 'offline').length,
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

  return (
    <div className="flex flex-col">
      <Header title="Players" />

      <div className="flex-1 space-y-6 p-6">
        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="all">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="online" className="text-green-600">
                Online ({statusCounts.online})
              </TabsTrigger>
              <TabsTrigger value="idle" className="text-yellow-600">
                Idle ({statusCounts.idle})
              </TabsTrigger>
              <TabsTrigger value="offline" className="text-red-600">
                Offline ({statusCounts.offline})
              </TabsTrigger>
            </TabsList>
            <Button
              onClick={fetchPlayers}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location || ''}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading players</p>
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchPlayers}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-lg" />
            ))}
          </div>
        )}

        {/* Player Grid */}
        {!isLoading && !error && (
          <>
            {filteredPlayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <Monitor className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No players found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || locationFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No players are configured yet'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPlayers.map((player) => (
                  <PlayerCard key={player._id} player={player} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

