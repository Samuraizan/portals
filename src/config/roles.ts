/**
 * Role-based access control configuration for Portals Management Platform
 */

export type Permission =
  | 'canViewPlayers'
  | 'canUploadContent'
  | 'canScheduleContent'
  | 'canDeleteContent'
  | 'canDeployToPlayers'
  | 'canControlPlayback'
  | 'canViewAnalytics'
  | 'canManageUsers'
  | 'canViewAuditLogs'
  | 'canEditPermissions';

export interface RoleConfig {
  displayName: string;
  description: string;
  allowedPlayers: string[] | '*';
  allowedLocations: string[];
  permissions: Record<Permission, boolean>;
}

export const ROLES: Record<string, RoleConfig> = {
  'cas-admin': {
    displayName: 'Administrator',
    description: 'Full access to all features and players',
    allowedPlayers: '*',
    allowedLocations: ['SFO', 'BLR'],
    permissions: {
      canViewPlayers: true,
      canUploadContent: true,
      canScheduleContent: true,
      canDeleteContent: true,
      canDeployToPlayers: true,
      canControlPlayback: true,
      canViewAnalytics: true,
      canManageUsers: true,
      canViewAuditLogs: true,
      canEditPermissions: true,
    },
  },
  'property-manager': {
    displayName: 'Property Manager',
    description: 'Manage content for all players at their location',
    allowedPlayers: '*',
    allowedLocations: ['SFO', 'BLR'],
    permissions: {
      canViewPlayers: true,
      canUploadContent: true,
      canScheduleContent: true,
      canDeleteContent: false,
      canDeployToPlayers: true,
      canControlPlayback: true,
      canViewAnalytics: true,
      canManageUsers: false,
      canViewAuditLogs: false,
      canEditPermissions: false,
    },
  },
  'activity-manager': {
    displayName: 'Activity Manager',
    description: 'Manage content for event-related screens',
    allowedPlayers: [
      'Multiverse TV',
      'Multiverse TV (movable)',
      'Degen Lounge Projector',
      'Schelling Point Projector',
      'Schelling Point Left',
      'Schelling Point Right',
    ],
    allowedLocations: ['SFO'],
    permissions: {
      canViewPlayers: true,
      canUploadContent: true,
      canScheduleContent: true,
      canDeleteContent: false,
      canDeployToPlayers: false,
      canControlPlayback: true,
      canViewAnalytics: false,
      canManageUsers: false,
      canViewAuditLogs: false,
      canEditPermissions: false,
    },
  },
  'front-desk-manager': {
    displayName: 'Front Desk Manager',
    description: 'Manage lobby and entrance screens',
    allowedPlayers: [
      'Entrance Lobby',
      '2nd Floor Lobby',
      'Hallway entrance Blrxzo',
      'BLRxZo Entrance',
    ],
    allowedLocations: ['SFO', 'BLR'],
    permissions: {
      canViewPlayers: true,
      canUploadContent: true,
      canScheduleContent: true,
      canDeleteContent: false,
      canDeployToPlayers: false,
      canControlPlayback: false,
      canViewAnalytics: false,
      canManageUsers: false,
      canViewAuditLogs: false,
      canEditPermissions: false,
    },
  },
  founder: {
    displayName: 'Founder',
    description: 'View-only access to all players',
    allowedPlayers: '*',
    allowedLocations: ['SFO', 'BLR'],
    permissions: {
      canViewPlayers: true,
      canUploadContent: false,
      canScheduleContent: false,
      canDeleteContent: false,
      canDeployToPlayers: false,
      canControlPlayback: false,
      canViewAnalytics: true,
      canManageUsers: false,
      canViewAuditLogs: false,
      canEditPermissions: false,
    },
  },
  citizen: {
    displayName: 'Community Member',
    description: 'Limited view access',
    allowedPlayers: [],
    allowedLocations: [],
    permissions: {
      canViewPlayers: false,
      canUploadContent: false,
      canScheduleContent: false,
      canDeleteContent: false,
      canDeployToPlayers: false,
      canControlPlayback: false,
      canViewAnalytics: false,
      canManageUsers: false,
      canViewAuditLogs: false,
      canEditPermissions: false,
    },
  },
  default: {
    displayName: 'Guest',
    description: 'No access',
    allowedPlayers: [],
    allowedLocations: [],
    permissions: {
      canViewPlayers: false,
      canUploadContent: false,
      canScheduleContent: false,
      canDeleteContent: false,
      canDeployToPlayers: false,
      canControlPlayback: false,
      canViewAnalytics: false,
      canManageUsers: false,
      canViewAuditLogs: false,
      canEditPermissions: false,
    },
  },
};

// Player location mapping
export const PLAYER_LOCATIONS: Record<string, string> = {
  'Schelling Point Left': 'SFO',
  'Schelling Point Right': 'SFO',
  'Schelling Point Projector': 'SFO',
  'Multiverse TV': 'SFO',
  'Multiverse TV (movable)': 'SFO',
  'Degen Lounge Projector': 'SFO',
  'Entrance Lobby': 'SFO',
  '2nd Floor Lobby': 'SFO',
  'Hallway entrance Blrxzo': 'BLR',
  'BLRxZo Entrance': 'BLR',
};

