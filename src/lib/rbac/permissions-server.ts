/**
 * Server-side permission functions that access the database
 * These should only be imported in API routes, not in client components
 */
import { ZoUser } from '@/types';
import { supabase } from '@/lib/db/client';
import { AccessLevel, ACCESS_LEVEL_PERMISSIONS, Permission } from '@/config/roles';
import { getUserPermissions, PlayerPermission, UserPermissions } from './permissions';

export type { PlayerPermission, UserPermissions };

/**
 * Get user's permissions including database-stored custom permissions (async version)
 */
export async function getUserPermissionsWithCustom(user: ZoUser): Promise<UserPermissions> {
  const basePermissions = getUserPermissions(user);
  
  try {
    // Fetch custom player permissions from database
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('zo_user_id', user.id)
      .single();

    if (!dbUser) return basePermissions;

    const { data: customPermissions } = await supabase
      .from('user_player_permissions')
      .select('*')
      .eq('user_id', dbUser.id)
      .or('expires_at.is.null,expires_at.gt.now()');

    if (customPermissions && customPermissions.length > 0) {
      // Add custom player IDs to allowed players
      const customPlayerIds = customPermissions.map(p => p.player_id);
      const customPlayerNames = customPermissions.map(p => p.player_name);
      
      let allowedPlayers: string[] | '*';
      if (basePermissions.allowedPlayers === '*') {
        allowedPlayers = '*';
      } else {
        allowedPlayers = [
          ...new Set([
            ...basePermissions.allowedPlayers,
            ...customPlayerIds,
            ...customPlayerNames,
          ]),
        ];
      }

      return {
        ...basePermissions,
        allowedPlayers,
        customPlayerPermissions: customPermissions.map(p => ({
          playerId: p.player_id,
          playerName: p.player_name,
          accessLevel: p.access_level as AccessLevel,
          grantedBy: p.granted_by,
          grantedAt: p.granted_at,
          expiresAt: p.expires_at,
          notes: p.notes,
        })),
      };
    }
  } catch (error) {
    console.warn('Failed to fetch custom permissions:', error);
  }

  return basePermissions;
}

/**
 * Check if user can access a specific player (async version - includes database permissions)
 */
export async function canAccessPlayerWithCustom(
  user: ZoUser,
  playerId: string,
  playerName: string
): Promise<{ allowed: boolean; accessLevel?: AccessLevel }> {
  const permissions = await getUserPermissionsWithCustom(user);

  // Admin has access to all
  if (permissions.allowedPlayers === '*') {
    return { allowed: true, accessLevel: 'admin' };
  }

  // Check role-based access
  if (
    permissions.allowedPlayers.includes(playerId) ||
    permissions.allowedPlayers.includes(playerName)
  ) {
    // Check if there's a custom permission with specific access level
    const customPerm = permissions.customPlayerPermissions?.find(
      p => p.playerId === playerId || p.playerName === playerName
    );
    
    return {
      allowed: true,
      accessLevel: customPerm?.accessLevel || 'manage',
    };
  }

  return { allowed: false };
}

/**
 * Get user's access level for a specific player
 */
export async function getPlayerAccessLevel(
  user: ZoUser,
  playerId: string
): Promise<AccessLevel | null> {
  try {
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('zo_user_id', user.id)
      .single();

    if (!dbUser) return null;

    const { data: permission } = await supabase
      .from('user_player_permissions')
      .select('access_level')
      .eq('user_id', dbUser.id)
      .eq('player_id', playerId)
      .or('expires_at.is.null,expires_at.gt.now()')
      .single();

    return permission?.access_level as AccessLevel || null;
  } catch {
    return null;
  }
}

/**
 * Filter players list based on user's access (async with custom permissions)
 * Works with any object that has _id and name properties
 */
export async function filterAllowedPlayersWithCustom<T extends { _id: string; name: string }>(
  user: ZoUser,
  players: T[]
): Promise<T[]> {
  const permissions = await getUserPermissionsWithCustom(user);

  if (permissions.allowedPlayers === '*') return players;

  return players.filter(
    (player) =>
      permissions.allowedPlayers.includes(player._id) ||
      permissions.allowedPlayers.includes(player.name)
  );
}

// ============ Permission Management Functions ============

/**
 * Grant player access to a user
 */
export async function grantPlayerAccess(params: {
  userId: string;
  phoneNumber: string;
  playerId: string;
  playerName: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  expiresAt?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_player_permissions')
      .upsert({
        user_id: params.userId,
        phone_number: params.phoneNumber,
        player_id: params.playerId,
        player_name: params.playerName,
        access_level: params.accessLevel,
        granted_by: params.grantedBy,
        granted_at: new Date().toISOString(),
        expires_at: params.expiresAt || null,
        notes: params.notes || null,
      }, {
        onConflict: 'user_id,player_id',
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to grant access' };
  }
}

/**
 * Revoke player access from a user
 */
export async function revokePlayerAccess(params: {
  userId: string;
  playerId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_player_permissions')
      .delete()
      .eq('user_id', params.userId)
      .eq('player_id', params.playerId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to revoke access' };
  }
}

/**
 * Get all users with access to a specific player
 */
export async function getUsersWithPlayerAccess(playerId: string): Promise<{
  success: boolean;
  data?: Array<{
    userId: string;
    phoneNumber: string;
    accessLevel: AccessLevel;
    grantedBy: string;
    grantedAt: string;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('user_player_permissions')
      .select('user_id, phone_number, access_level, granted_by, granted_at')
      .eq('player_id', playerId)
      .or('expires_at.is.null,expires_at.gt.now()');

    if (error) throw error;
    
    return {
      success: true,
      data: data?.map(d => ({
        userId: d.user_id,
        phoneNumber: d.phone_number,
        accessLevel: d.access_level as AccessLevel,
        grantedBy: d.granted_by,
        grantedAt: d.granted_at,
      })),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch users' };
  }
}

/**
 * Get all player permissions for a user
 */
export async function getUserPlayerPermissions(userId: string): Promise<{
  success: boolean;
  data?: PlayerPermission[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('user_player_permissions')
      .select('*')
      .eq('user_id', userId)
      .or('expires_at.is.null,expires_at.gt.now()');

    if (error) throw error;
    
    return {
      success: true,
      data: data?.map(p => ({
        playerId: p.player_id,
        playerName: p.player_name,
        accessLevel: p.access_level as AccessLevel,
        grantedBy: p.granted_by,
        grantedAt: p.granted_at,
        expiresAt: p.expires_at,
        notes: p.notes,
      })),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch permissions' };
  }
}

