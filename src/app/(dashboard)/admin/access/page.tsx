'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  UserPlus, 
  Trash2, 
  Monitor, 
  Shield, 
  Eye,
  Settings,
  Phone
} from 'lucide-react';

interface Player {
  _id: string;
  name: string;
  isConnected?: boolean;
}

interface Permission {
  id: string;
  user_id: string;
  phone_number: string;
  player_id: string;
  player_name: string;
  access_level: 'view' | 'manage' | 'admin';
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  notes?: string;
  users?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

const ACCESS_LEVEL_CONFIG = {
  view: { label: 'View Only', color: 'secondary', icon: Eye },
  manage: { label: 'Manage', color: 'default', icon: Settings },
  admin: { label: 'Full Control', color: 'destructive', icon: Shield },
};

export default function AccessManagementPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accessLevel, setAccessLevel] = useState<'view' | 'manage' | 'admin'>('manage');
  const [notes, setNotes] = useState('');

  // Fetch players and permissions
  useEffect(() => {
    if (!hasPermission('canManageUsers')) return;
    
    const fetchData = async () => {
      try {
        const [playersRes, permissionsRes] = await Promise.all([
          fetch('/api/players'),
          fetch('/api/admin/permissions'),
        ]);

        if (playersRes.ok) {
          const playersData = await playersRes.json();
          setPlayers(playersData.data || []);
        }

        if (permissionsRes.ok) {
          const permissionsData = await permissionsRes.json();
          setPermissions(permissionsData.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hasPermission]);

  const handleGrantAccess = async () => {
    if (!selectedPlayer || !phoneNumber) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          playerId: selectedPlayer._id,
          playerName: selectedPlayer.name,
          accessLevel,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh permissions
        const permissionsRes = await fetch('/api/admin/permissions');
        if (permissionsRes.ok) {
          const permissionsData = await permissionsRes.json();
          setPermissions(permissionsData.data || []);
        }
        
        // Reset form
        setPhoneNumber('');
        setAccessLevel('manage');
        setNotes('');
        setIsGrantDialogOpen(false);
      } else {
        alert(data.error?.message || 'Failed to grant access');
      }
    } catch (error) {
      console.error('Grant access error:', error);
      alert('Failed to grant access');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAccess = async (permission: Permission) => {
    if (!confirm(`Revoke ${permission.phone_number}'s access to ${permission.player_name}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: permission.user_id,
          playerId: permission.player_id,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPermissions(permissions.filter(p => p.id !== permission.id));
      } else {
        alert(data.error?.message || 'Failed to revoke access');
      }
    } catch (error) {
      console.error('Revoke access error:', error);
      alert('Failed to revoke access');
    }
  };

  if (!hasPermission('canManageUsers')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to manage user access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Group permissions by player
  const permissionsByPlayer = permissions.reduce((acc, perm) => {
    if (!acc[perm.player_id]) {
      acc[perm.player_id] = [];
    }
    acc[perm.player_id].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Management</h1>
          <p className="text-muted-foreground">
            Assign players to marketing team members
          </p>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => {
          const playerPerms = permissionsByPlayer[player._id] || [];
          
          return (
            <Card key={player._id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className={`w-5 h-5 ${player.isConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-lg">{player.name}</CardTitle>
                  </div>
                  <Dialog open={isGrantDialogOpen && selectedPlayer?._id === player._id} onOpenChange={(open) => {
                    setIsGrantDialogOpen(open);
                    if (open) setSelectedPlayer(player);
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Grant Access to {player.name}</DialogTitle>
                        <DialogDescription>
                          Add a team member's phone number to give them access to this player.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <Input
                              id="phone"
                              placeholder="+1234567890"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Access Level</Label>
                          <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as typeof accessLevel)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  <span>View Only</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="manage">
                                <div className="flex items-center gap-2">
                                  <Settings className="w-4 h-4" />
                                  <span>Manage (Upload, Schedule, Control)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  <span>Full Control (Including Delete)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Input
                            id="notes"
                            placeholder="Marketing campaign Q1"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGrantDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleGrantAccess} disabled={!phoneNumber || isSubmitting}>
                          {isSubmitting ? 'Granting...' : 'Grant Access'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <CardDescription>
                  {playerPerms.length} user{playerPerms.length !== 1 ? 's' : ''} with access
                </CardDescription>
              </CardHeader>
              <CardContent>
                {playerPerms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No custom access assigned</p>
                ) : (
                  <div className="space-y-2">
                    {playerPerms.map((perm) => {
                      const config = ACCESS_LEVEL_CONFIG[perm.access_level];
                      const Icon = config.icon;
                      
                      return (
                        <div
                          key={perm.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{perm.phone_number}</span>
                            <Badge variant={config.color as 'default' | 'secondary' | 'destructive'} className="text-xs">
                              {config.label}
                            </Badge>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRevokeAccess(perm)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All Permissions Table */}
      {permissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Access Permissions</CardTitle>
            <CardDescription>
              Complete list of custom player permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Granted By</TableHead>
                  <TableHead>Granted At</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((perm) => {
                  const config = ACCESS_LEVEL_CONFIG[perm.access_level];
                  
                  return (
                    <TableRow key={perm.id}>
                      <TableCell className="font-medium">{perm.phone_number}</TableCell>
                      <TableCell>{perm.player_name}</TableCell>
                      <TableCell>
                        <Badge variant={config.color as 'default' | 'secondary' | 'destructive'}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{perm.granted_by}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(perm.granted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{perm.notes || '-'}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRevokeAccess(perm)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

