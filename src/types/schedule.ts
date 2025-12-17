export type ScheduleStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Schedule {
  id: string;
  contentId?: string;
  playerIds: string[];
  playlistName: string;
  startTime: string;
  endTime: string;
  deployedByUserId: string;
  deployedByPhone: string;
  status: ScheduleStatus;
  deployedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleAsset {
  filename: string;
  duration: number;
  selected?: boolean;
}

export interface ScheduleSettings {
  durationEnable?: boolean;
  startdate?: string;
  enddate?: string;
  timeEnable?: boolean;
  starttime?: string;
  endtime?: string;
  weekdays?: number[];
}

export interface PlaylistSchedule {
  name: string;
  settings: ScheduleSettings;
}

export interface PiSignagePlaylist {
  name: string;
  layout?: string;
  assets: ScheduleAsset[];
  settings?: {
    ticker?: {
      enable: boolean;
    };
  };
}

export interface DeployData {
  deploy: boolean;
  playlists: PlaylistSchedule[];
  assets?: string[];
}

export interface CreateScheduleRequest {
  contentIds: string[];
  playerIds: string[];
  playlistName: string;
  startTime: string;
  endTime: string;
  assets: ScheduleAsset[];
}

