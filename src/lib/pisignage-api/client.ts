import axios from 'axios';
import { env } from '@/config/env';

// Simple PiSignage client without interceptors (prevents memory leaks)
class PiSignageClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = env.PISIGNAGE_API_URL;
  }

  private async authenticate(): Promise<string> {
    if (this.token) return this.token;

    const response = await axios.post(`${this.baseURL}/session`, {
      email: env.PISIGNAGE_USERNAME,
      password: env.PISIGNAGE_PASSWORD,
      getToken: true,
    });

    this.token = response.data.token;
    return this.token!;
  }

  async getPlayers() {
    const token = await this.authenticate();
    
    const response = await axios.get(`${this.baseURL}/players`, {
      headers: { 'x-access-token': token },
      params: { per_page: 100 },
    });

    return response.data;
  }

  async getPlayer(playerId: string) {
    const token = await this.authenticate();
    
    const response = await axios.get(`${this.baseURL}/players/${playerId}`, {
      headers: { 'x-access-token': token },
    });

    return response.data;
  }

  async controlPlayer(playerId: string, action: string) {
    const token = await this.authenticate();
    
    const response = await axios.post(
      `${this.baseURL}/playlistmedia/${playerId}/${action}`,
      {},
      { headers: { 'x-access-token': token } }
    );

    return response.data;
  }

  async getPlaylists() {
    const token = await this.authenticate();
    
    const response = await axios.get(`${this.baseURL}/playlists`, {
      headers: { 'x-access-token': token },
    });

    return response.data;
  }

  async getFiles() {
    const token = await this.authenticate();
    
    const response = await axios.get(`${this.baseURL}/files`, {
      headers: { 'x-access-token': token },
    });

    return response.data;
  }

  async uploadFile(formData: FormData) {
    const token = await this.authenticate();
    
    const response = await axios.post(`${this.baseURL}/files`, formData, {
      headers: {
        'x-access-token': token,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000,
    });

    return response.data;
  }

  async deleteFile(filename: string) {
    const token = await this.authenticate();
    
    const response = await axios.delete(`${this.baseURL}/files/${filename}`, {
      headers: { 'x-access-token': token },
    });

    return response.data;
  }

  async setPlaylist(playerId: string, playlistName: string) {
    const token = await this.authenticate();
    
    const response = await axios.post(
      `${this.baseURL}/setplaylist/${playerId}/${playlistName}`,
      {},
      { headers: { 'x-access-token': token } }
    );

    return response.data;
  }
}

export const piSignageClient = new PiSignageClient();
