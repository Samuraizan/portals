'use client';

import { useAuth } from '@/components/auth/auth-provider';
import {
  getUserPermissions,
  hasPermission as checkPermission,
  canAccessPlayer as checkPlayerAccess,
  Permission,
} from '@/lib/rbac/permissions';

export function usePermissions() {
  const { user } = useAuth();

  if (!user) {
    return {
      permissions: null,
      role: 'default',
      displayName: 'Guest',
      hasPermission: () => false,
      canAccessPlayer: () => false,
      allowedPlayers: [] as string[],
      allowedLocations: [] as string[],
    };
  }

  const permissions = getUserPermissions(user);

  return {
    permissions: permissions.permissions,
    role: permissions.role,
    displayName: permissions.displayName,
    allowedPlayers: permissions.allowedPlayers,
    allowedLocations: permissions.allowedLocations,
    hasPermission: (permission: Permission) => checkPermission(user, permission),
    canAccessPlayer: (playerId: string, playerName: string) =>
      checkPlayerAccess(user, playerId, playerName),
  };
}

