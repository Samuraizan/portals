import { ZoUser, Player } from '@/types';
import { ROLES, Permission, RoleConfig, AccessLevel, ACCESS_LEVEL_PERMISSIONS } from '@/config/roles';

// Re-export types
export type { Permission, AccessLevel } from '@/config/roles';

export interface UserPermissions {
  role: string;
  displayName: string;
  allowedPlayers: string[] | '*';
  allowedLocations: string[];
  permissions: Record<Permission, boolean>;
  customPlayerPermissions?: PlayerPermission[];
}

export interface PlayerPermission {
  playerId: string;
  playerName: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  notes?: string;
}

/**
 * Extract user's role from Zo API user object
 * Priority: roles array > access_groups > membership > default
 */
export function extractUserRole(user: ZoUser): string {
  // Priority 1: Check roles array
  if (user.roles && user.roles.length > 0) {
    // cas-admin is highest priority
    if (user.roles.includes('cas-admin')) return 'cas-admin';
    
    // Check for known roles
    const knownRoles = Object.keys(ROLES);
    for (const role of user.roles) {
      if (knownRoles.includes(role)) return role;
    }
    
    return user.roles[0];
  }

  // Priority 2: Check access_groups
  if (user.access_groups && user.access_groups.length > 0) {
    const knownGroups = ['property-manager', 'activity-manager', 'front-desk-manager', 'marketing'];
    for (const group of knownGroups) {
      if (user.access_groups.includes(group)) return group;
    }
  }

  // Priority 3: Fall back to membership
  if (user.membership === 'founder') return 'founder';
  if (user.membership === 'citizen') return 'citizen';

  // Default: no special role
  return 'default';
}

/**
 * Get user's permissions based on their role (sync version - client safe)
 */
export function getUserPermissions(user: ZoUser): UserPermissions {
  const role = extractUserRole(user);
  const roleConfig: RoleConfig = ROLES[role] || ROLES.default;

  return {
    role,
    displayName: roleConfig.displayName,
    allowedPlayers: roleConfig.allowedPlayers,
    allowedLocations: roleConfig.allowedLocations,
    permissions: roleConfig.permissions,
  };
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: ZoUser, permission: Permission): boolean {
  const permissions = getUserPermissions(user);
  return permissions.permissions[permission] === true;
}

/**
 * Check if user can access a specific player (sync version - uses role config only)
 */
export function canAccessPlayer(
  user: ZoUser,
  playerId: string,
  playerName: string
): boolean {
  const permissions = getUserPermissions(user);

  // Admin has access to all
  if (permissions.allowedPlayers === '*') return true;

  // Check if player is in allowed list (by ID or name)
  return (
    permissions.allowedPlayers.includes(playerId) ||
    permissions.allowedPlayers.includes(playerName)
  );
}

/**
 * Filter players list based on user's access (sync version - client safe)
 */
export function filterAllowedPlayers(user: ZoUser, players: Player[]): Player[] {
  const permissions = getUserPermissions(user);

  if (permissions.allowedPlayers === '*') return players;

  return players.filter(
    (player) =>
      permissions.allowedPlayers.includes(player._id) ||
      permissions.allowedPlayers.includes(player.name)
  );
}

/**
 * Check if user can access a location
 */
export function canAccessLocation(user: ZoUser, location: string): boolean {
  const permissions = getUserPermissions(user);
  return permissions.allowedLocations.includes(location);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): RoleConfig {
  return ROLES[role] || ROLES.default;
}

/**
 * Check if a role exists
 */
export function isValidRole(role: string): boolean {
  return role in ROLES;
}

/**
 * Check if user has specific permission for a player based on access level
 */
export function accessLevelHasPermission(
  accessLevel: AccessLevel,
  permission: Permission
): boolean {
  return ACCESS_LEVEL_PERMISSIONS[accessLevel]?.includes(permission) || false;
}
