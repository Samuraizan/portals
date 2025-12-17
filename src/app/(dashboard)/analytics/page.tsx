'use client';

import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Monitor, Upload, Calendar, Users } from 'lucide-react';

export default function AnalyticsPage() {
  const { hasPermission } = usePermissions();

  if (!hasPermission('canViewAnalytics')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to view analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Analytics" />

      <div className="flex-1 space-y-6 p-6">
        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Players"
            value="27"
            icon={Monitor}
            description="Across all locations"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Content Uploads"
            value="156"
            icon={Upload}
            description="This month"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Schedules Created"
            value="42"
            icon={Calendar}
            description="This month"
            trend={{ value: 5, isPositive: true }}
          />
          <StatsCard
            title="Active Users"
            value="12"
            icon={Users}
            description="Last 30 days"
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Player Uptime</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <p>Chart coming soon</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Plays</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <p>Chart coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Content */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
            <CardDescription>Most played content this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <p>Content rankings coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

