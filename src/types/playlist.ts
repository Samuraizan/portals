export interface PlaylistAsset {
  filename: string;
  duration: number;
  selected: boolean;
  type?: 'image' | 'video';
}

export interface Playlist {
  name: string;
  settings?: {
    advancement?: string;
    advancement_default?: number;
    advancement_onkey?: string;
    advancement_onidle?: string;
    advancement_onidle_default?: number;
    advancement_onidle_boredom?: number;
    randomadvancement?: boolean;
    randomadvancement_delay?: number;
    randomadvancement_delay_isidle?: number;
    randomAdvancement_boredom?: number;
    ticker?: {
      enable?: boolean;
    };
    templateName?: string;
    templateSide?: string;
    templateMessage?: string;
    audio?: {
      enable?: boolean;
    };
    transitionKey?: string;
  };
  assets: PlaylistAsset[];
  layout?: string;
  templateName?: string;
  skipForadvancement?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaylistsResponse {
  success: boolean;
  data: Playlist[];
  error?: {
    code: string;
    message: string;
  };
}

