import axios from 'axios';
import { env } from '@/config/env';

interface Player {
  _id: string;
  name: string;
  isConnected?: boolean;
  group?: { _id: string; name: string };
  [key: string]: unknown;
}

interface PlayersResponse {
  success: boolean;
  data: {
    objects: Player[];
  };
  error?: { message: string };
}

interface PlayerResponse {
  success: boolean;
  data?: Player;
  error?: string;
}

interface ApiResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

// Simple PiSignage client without interceptors (prevents memory leaks)
class PiSignageClient {
  private _baseURL: string | null = null;
  private token: string | null = null;

  // Lazy initialization
  private get baseURL(): string {
    if (!this._baseURL) {
      this._baseURL = env.PISIGNAGE_API_URL;
    }
    return this._baseURL;
  }

  private async authenticate(): Promise<string> {
    if (this.token) return this.token;

    console.log('[PiSignage] Authenticating with:', this.baseURL);
    console.log('[PiSignage] Username:', env.PISIGNAGE_USERNAME);
    
    try {
      const response = await axios.post(`${this.baseURL}/session`, {
        email: env.PISIGNAGE_USERNAME,
        password: env.PISIGNAGE_PASSWORD,
        getToken: true,
      });

      console.log('[PiSignage] Auth response:', response.data);
      this.token = response.data.token;
      return this.token!;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[PiSignage] Auth error:', error.response?.status, error.response?.data);
      }
      throw error;
    }
  }

  async getPlayers(): Promise<PlayersResponse> {
    try {
      const token = await this.authenticate();
      console.log('[PiSignage] Fetching players with token:', token?.substring(0, 20) + '...');
      
      const response = await axios.get(`${this.baseURL}/players`, {
        headers: { 'x-access-token': token },
        params: { per_page: 100 },
      });

      console.log('[PiSignage] Players response keys:', Object.keys(response.data));
      console.log('[PiSignage] Players count:', response.data?.data?.objects?.length || response.data?.objects?.length || 0);

      // Handle both response formats
      const players = response.data?.data?.objects || response.data?.objects || [];
      
      return {
        success: true,
        data: { objects: players },
      };
    } catch (error) {
      console.error('[PiSignage] Get players error:', error instanceof Error ? error.message : error);
      if (axios.isAxiosError(error)) {
        console.error('[PiSignage] Error details:', error.response?.status, error.response?.data);
      }
      return {
        success: false,
        data: { objects: [] },
        error: { message: error instanceof Error ? error.message : 'Failed to fetch players' },
      };
    }
  }

  async getPlayerById(playerId: string): Promise<PlayerResponse> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.get(`${this.baseURL}/players/${playerId}`, {
        headers: { 'x-access-token': token },
      });

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch player',
      };
    }
  }

  async controlPlayer(playerId: string, action: 'play' | 'pause' | 'reboot'): Promise<ApiResult> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(
        `${this.baseURL}/playlistmedia/${playerId}/${action}`,
        {},
        { headers: { 'x-access-token': token } }
      );

      return {
        success: true,
        message: response.data.message || `Action ${action} executed`,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to control player',
      };
    }
  }

  async setPlayerPlaylist(playerId: string, playlistName: string): Promise<ApiResult> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(
        `${this.baseURL}/setplaylist/${playerId}/${playlistName}`,
        {},
        { headers: { 'x-access-token': token } }
      );

      return {
        success: true,
        message: response.data.message || `Playlist set to ${playlistName}`,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set playlist',
      };
    }
  }

  async getPlaylists(): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.get(`${this.baseURL}/playlists`, {
        headers: { 'x-access-token': token },
      });

      return {
        success: true,
        data: response.data.data?.objects || response.data.objects || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch playlists',
      };
    }
  }

  async getFiles(): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.get(`${this.baseURL}/files`, {
        headers: { 'x-access-token': token },
      });

      return {
        success: true,
        data: response.data.data?.objects || response.data.objects || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch files',
      };
    }
  }

  async uploadFile(formData: FormData): Promise<{ success: boolean; data?: { name: string; type: string; size: number }; error?: string }> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(`${this.baseURL}/files`, formData, {
        headers: {
          'x-access-token': token,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000,
      });

      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      };
    }
  }

  async deleteFile(filename: string): Promise<ApiResult> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.delete(`${this.baseURL}/files/${filename}`, {
        headers: { 'x-access-token': token },
      });

      return {
        success: true,
        message: response.data.message || 'File deleted',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      };
    }
  }

  async createPlaylist(name: string): Promise<ApiResult> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(
        `${this.baseURL}/playlists`,
        { name },
        { headers: { 'x-access-token': token } }
      );

      return {
        success: true,
        message: response.data.message || 'Playlist created',
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create playlist',
      };
    }
  }

  async updatePlaylist(name: string, data: { assets: Array<{ filename: string; duration: number; selected: boolean }> }): Promise<ApiResult> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(
        `${this.baseURL}/playlists/${name}`,
        data,
        { headers: { 'x-access-token': token } }
      );

      return {
        success: true,
        message: response.data.message || 'Playlist updated',
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update playlist',
      };
    }
  }

  async deployToGroup(groupId: string, deployData: unknown): Promise<ApiResult> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(
        `${this.baseURL}/groups/${groupId}`,
        deployData,
        { headers: { 'x-access-token': token } }
      );

      return {
        success: true,
        message: response.data.message || 'Deployed to group',
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deploy to group',
      };
    }
  }
}

export const piSignageClient = new PiSignageClient();
