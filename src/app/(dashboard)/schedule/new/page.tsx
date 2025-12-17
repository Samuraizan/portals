'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/dashboard/header';
import { usePermissions } from '@/hooks/use-permissions';
import { Player } from '@/types/player';
import { UploadedContent } from '@/types/content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn, formatFileSize } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  FileVideo,
  FileImage,
} from 'lucide-react';

export default function NewSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, canAccessPlayer } = usePermissions();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [content, setContent] = useState<UploadedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [playlistName, setPlaylistName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');

  // Pre-select player/content from URL params
  useEffect(() => {
    const playerId = searchParams.get('player');
    const contentId = searchParams.get('content');
    if (playerId) setSelectedPlayers([playerId]);
    if (contentId) setSelectedContent([contentId]);
  }, [searchParams]);

  useEffect(() => {
    if (hasPermission('canScheduleContent')) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [hasPermission]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [playersRes, contentRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/content'),
      ]);
      
      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData.data || []);
      }
      
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        setContent(contentData.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleContent = (contentId: string) => {
    setSelectedContent((prev) =>
      prev.includes(contentId)
        ? prev.filter((id) => id !== contentId)
        : [...prev, contentId]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!playlistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    if (selectedPlayers.length === 0) {
      toast.error('Please select at least one player');
      return;
    }
    if (selectedContent.length === 0) {
      toast.error('Please select at least one content item');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const startDateTime = new Date(startDate);
      const [startHour, startMin] = startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMin);

      const endDateTime = new Date(endDate);
      const [endHour, endMin] = endTime.split(':').map(Number);
      endDateTime.setHours(endHour, endMin);

      // Get asset filenames
      const assets = selectedContent.map((id) => {
        const item = content.find((c) => c.id === id);
        return {
          filename: item?.pisignageFilename || item?.filename || '',
          duration: item?.duration || 10,
        };
      });

      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistName,
          playerIds: selectedPlayers,
          contentIds: selectedContent,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          assets,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Schedule created successfully');
        router.push('/schedule');
      } else {
        toast.error(data.error?.message || 'Failed to create schedule');
      }
    } catch {
      toast.error('Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasPermission('canScheduleContent')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to create schedules.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Create Schedule" />
        <div className="flex-1 space-y-6 p-6">
          <Skeleton className="h-10 w-32" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Create Schedule" />

      <div className="flex-1 space-y-6 p-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/schedule">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Schedules
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Selection */}
          <div className="space-y-6">
            {/* Playlist Name */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule Details</CardTitle>
                <CardDescription>Name your playlist and set the schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playlistName">Playlist Name</Label>
                  <Input
                    id="playlistName"
                    placeholder="e.g., Holiday Campaign 2024"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                  />
                </div>

                {/* Date Selection */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !startDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !endDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Players</CardTitle>
                <CardDescription>
                  Choose which displays to show this content on
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {players.filter((p) => canAccessPlayer(p._id, p.name)).map((player) => (
                    <div
                      key={player._id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                        selectedPlayers.includes(player._id) && 'border-primary bg-primary/5'
                      )}
                      onClick={() => togglePlayer(player._id)}
                    >
                      <Checkbox
                        checked={selectedPlayers.includes(player._id)}
                        onCheckedChange={() => togglePlayer(player._id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {player.configLocation}
                        </p>
                      </div>
                      {selectedPlayers.includes(player._id) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''} selected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Content Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Content</CardTitle>
                <CardDescription>
                  Choose content to include in this schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid max-h-[500px] gap-2 overflow-y-auto sm:grid-cols-2">
                  {content.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'relative cursor-pointer rounded-lg border p-2 transition-colors',
                        selectedContent.includes(item.id) && 'border-primary bg-primary/5'
                      )}
                      onClick={() => toggleContent(item.id)}
                    >
                      <div className="aspect-video rounded bg-muted flex items-center justify-center">
                        {item.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="h-full w-full rounded object-cover"
                          />
                        ) : item.mimeType.startsWith('video/') ? (
                          <FileVideo className="h-8 w-8 text-muted-foreground" />
                        ) : (
                          <FileImage className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium truncate">
                          {item.metadata?.title || item.originalFilename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(Number(item.fileSize))}
                        </p>
                      </div>
                      {selectedContent.includes(item.id) && (
                        <div className="absolute right-2 top-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedContent.length} item{selectedContent.length !== 1 ? 's' : ''} selected
                </p>
              </CardContent>
            </Card>

            {/* Summary & Submit */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Playlist</span>
                    <span className="font-medium">{playlistName || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Players</span>
                    <span className="font-medium">{selectedPlayers.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Content Items</span>
                    <span className="font-medium">{selectedContent.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">
                      {startDate && endDate
                        ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
                        : '—'}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !playlistName ||
                    selectedPlayers.length === 0 ||
                    selectedContent.length === 0 ||
                    !startDate ||
                    !endDate
                  }
                >
                  {isSubmitting ? 'Creating...' : 'Create Schedule'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

