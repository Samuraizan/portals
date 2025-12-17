'use client';

import { Header } from '@/components/dashboard/header';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const { hasPermission } = usePermissions();

  if (!hasPermission('canManageUsers')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to access settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Settings" />

      <div className="flex-1 space-y-6 p-6">
        <div>
          <h2 className="text-xl font-semibold">System Settings</h2>
          <p className="text-muted-foreground">
            Configure global settings for the platform
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* PiSignage Connection */}
          <Card>
            <CardHeader>
              <CardTitle>PiSignage Connection</CardTitle>
              <CardDescription>
                Configure your PiSignage server connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Server URL</Label>
                <Input
                  value="https://sfoxzo.pisignage.com"
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Connected</span>
                </div>
                <Button variant="outline" size="sm">
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Zo API Connection */}
          <Card>
            <CardHeader>
              <CardTitle>Zo API Connection</CardTitle>
              <CardDescription>
                Configure your Zo authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API URL</Label>
                <Input
                  value="https://api.io.zo.xyz"
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Connected</span>
                </div>
                <Button variant="outline" size="sm">
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Default Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Default Content Settings</CardTitle>
            <CardDescription>
              Default values for new content uploads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Image Duration (seconds)</Label>
                <Input type="number" defaultValue="10" />
              </div>
              <div className="space-y-2">
                <Label>Default Video Loop Count</Label>
                <Input type="number" defaultValue="1" />
              </div>
              <div className="space-y-2">
                <Label>Max Upload Size (MB)</Label>
                <Input type="number" defaultValue="100" disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Recommended Resolution</Label>
                <Input value="1920 x 1080" disabled className="bg-muted" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Save Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

