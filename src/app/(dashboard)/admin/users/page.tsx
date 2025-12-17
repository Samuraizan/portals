'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/utils';
import { AlertCircle, MoreVertical, RefreshCw, UserPlus } from 'lucide-react';

interface User {
  id: string;
  zoUserId: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  membership?: string;
  roles: string[];
  accessGroups: string[];
  lastLogin: string;
}

export default function AdminUsersPage() {
  const { hasPermission, role } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission('canManageUsers')) {
      fetchUsers();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (user: User) => {
    if (user.roles?.includes('cas-admin')) {
      return <Badge>Admin</Badge>;
    }
    if (user.accessGroups?.includes('property-manager')) {
      return <Badge variant="secondary">Property Manager</Badge>;
    }
    if (user.accessGroups?.includes('activity-manager')) {
      return <Badge variant="secondary">Activity Manager</Badge>;
    }
    if (user.membership === 'founder') {
      return <Badge variant="outline">Founder</Badge>;
    }
    return <Badge variant="outline">Member</Badge>;
  };

  if (!hasPermission('canManageUsers')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to manage users.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="User Management" />

      <div className="flex-1 space-y-6 p-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Users</h2>
            <p className="text-muted-foreground">
              Manage user permissions and access
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchUsers} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading users</p>
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchUsers}>
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

        {/* Users Table */}
        {!isLoading && !error && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.firstName
                              ? `${user.firstName} ${user.lastName || ''}`
                              : 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{user.phoneNumber}</TableCell>
                      <TableCell>{getRoleBadge(user)}</TableCell>
                      <TableCell>{formatRelativeTime(new Date(user.lastLogin))}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Permissions</DropdownMenuItem>
                            <DropdownMenuItem>View Activity</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Revoke Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

