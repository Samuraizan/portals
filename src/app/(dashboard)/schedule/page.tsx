'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { usePermissions } from '@/hooks/use-permissions';
import { Schedule } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Plus, RefreshCw, AlertCircle, Clock } from 'lucide-react';

export default function SchedulePage() {
  const { hasPermission, role } = usePermissions();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission('canScheduleContent')) {
      fetchSchedules();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const fetchSchedules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/schedule');
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const data = await response.json();
      setSchedules(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!hasPermission('canScheduleContent')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to view schedules.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Schedule" />

      <div className="flex-1 space-y-6 p-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Content Schedules</h2>
            <p className="text-muted-foreground">
              Manage scheduled content deployments
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchSchedules} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/schedule/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Schedule
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {schedules.filter((s) => s.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scheduled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {schedules.filter((s) => s.status === 'scheduled').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {schedules.filter((s) => s.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schedules.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading schedules</p>
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchSchedules}>
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Schedules Table */}
        {!isLoading && !error && (
          <>
            {schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <Calendar className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No schedules yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first schedule to deploy content to players
                </p>
                <Button asChild className="mt-4">
                  <Link href="/schedule/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Schedule
                  </Link>
                </Button>
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Playlist</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">
                          {schedule.playlistName}
                        </TableCell>
                        <TableCell>
                          {schedule.playerIds.length} player{schedule.playerIds.length !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {new Date(schedule.startTime).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(schedule.endTime).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

