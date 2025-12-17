export interface PlayerGroup {
  _id: string;
  name: string;
}

export interface Player {
  _id: string;
  name: string;
  cpuSerialNumber: string;
  group: PlayerGroup;
  configLocation?: string;
  version?: string;
  myIpAddress?: string;
  playlistOn: boolean;
  currentPlaylist?: string;
  lastReported: number;
  tvStatus: boolean;
  status: 'online' | 'offline' | 'idle';
}

export interface PlayerStatus {
  playlistOn: boolean;
  currentPlaylist: string;
  currentPlayingFile: string;
  tvStatus: boolean;
  diskSpaceAvailable: string;
  playlistsDeployed: string[];
}

export interface PlayerFilters {
  per_page?: number;
  page?: number;
  location?: string;
  status?: 'online' | 'offline' | 'idle';
  search?: string;
}

export interface PlayersResponse {
  success: boolean;
  stat_message: string;
  data: {
    objects: Player[];
    count: number;
    page: number;
    pages: number;
  };
}

