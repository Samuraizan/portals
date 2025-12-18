import axios, { AxiosInstance } from 'axios';
import { env } from '@/config/env';
import {
  ZoUser,
  ZoLoginResponse,
  ZoRefreshResponse,
  OTPRequest,
  OTPVerifyRequest,
  DeviceCredentials,
} from '@/types/auth';

class ZoAPIClient {
  private _client: AxiosInstance | null = null;
  private deviceCredentials: DeviceCredentials | null = null;

  // Lazy initialization of axios client
  private get client(): AxiosInstance {
    if (!this._client) {
      this._client = axios.create({
        baseURL: env.ZO_API_BASE_URL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'client-key': env.ZO_CLIENT_KEY,
        },
      });
    }
    return this._client;
  }

  setDeviceCredentials(credentials: DeviceCredentials) {
    this.deviceCredentials = credentials;
  }

  private getHeaders(accessToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'client-key': env.ZO_CLIENT_KEY,
    };

    if (this.deviceCredentials) {
      headers['client-device-id'] = this.deviceCredentials.deviceId;
      headers['client-device-secret'] = this.deviceCredentials.deviceSecret;
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  generateDeviceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `web-${timestamp}-${random}`;
  }

  generateDeviceSecret(): string {
    const random1 = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    return `${random1}${random2}`;
  }

  async sendOTP(request: OTPRequest): Promise<{ success: boolean; message?: string; error?: string; deviceId?: string; deviceSecret?: string }> {
    try {
      const deviceId = this.deviceCredentials?.deviceId || this.generateDeviceId();
      const deviceSecret = this.deviceCredentials?.deviceSecret || this.generateDeviceSecret();
      
      this.deviceCredentials = { deviceId, deviceSecret };
      
      const payload = {
        mobile_country_code: request.mobile_country_code.replace('+', ''),
        mobile_number: request.mobile_number,
        message_channel: '',
      };

      const clientKey = env.ZO_CLIENT_KEY;
      const baseUrl = env.ZO_API_BASE_URL;
      
      console.log('[Zo API] Base URL:', baseUrl);
      console.log('[Zo API] Client Key (first 8 chars):', clientKey?.substring(0, 8) + '...');
      console.log('[Zo API] Device ID:', deviceId);
      console.log('[Zo API] Payload:', JSON.stringify(payload));

      // Make direct axios call with all headers explicitly set
      const response = await axios.post(
        `${baseUrl}/api/v1/auth/login/mobile/otp/`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'client-key': clientKey,
            'client-device-id': deviceId,
            'client-device-secret': deviceSecret,
          },
          timeout: 30000,
        }
      );

      console.log('[Zo API] Success response:', response.data);

      return {
        success: true,
        message: response.data.message || 'OTP sent successfully',
        deviceId,
        deviceSecret,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('[Zo API] OTP error status:', error.response?.status);
        console.error('[Zo API] OTP error data:', JSON.stringify(error.response?.data));
        console.error('[Zo API] OTP error headers:', JSON.stringify(error.config?.headers));
        return {
          success: false,
          error: error.response?.data?.errors?.[0] || error.response?.data?.error || error.response?.data?.message || 'Failed to send OTP',
        };
      }
      console.error('[Zo API] Unexpected error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  async verifyOTP(request: OTPVerifyRequest): Promise<{ success: boolean; data?: ZoLoginResponse; error?: string }> {
    try {
      const deviceId = this.deviceCredentials?.deviceId || this.generateDeviceId();
      const deviceSecret = this.deviceCredentials?.deviceSecret || this.generateDeviceSecret();

      const payload = {
        mobile_country_code: request.mobile_country_code.replace('+', ''),
        mobile_number: request.mobile_number,
        otp: request.otp.toString().trim(),
      };

      const clientKey = env.ZO_CLIENT_KEY;
      const baseUrl = env.ZO_API_BASE_URL;

      console.log('[Zo API] Verify - Device ID:', deviceId);
      console.log('[Zo API] Verify - Payload:', JSON.stringify(payload));

      const response = await axios.post<ZoLoginResponse>(
        `${baseUrl}/api/v1/auth/login/mobile/`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'client-key': clientKey,
            'client-device-id': deviceId,
            'client-device-secret': deviceSecret,
          },
          timeout: 30000,
        }
      );

      this.deviceCredentials = {
        deviceId: response.data.device_id,
        deviceSecret: response.data.device_secret,
      };

      return {
        success: true,
        data: response.data,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('[Zo API] Verify error status:', error.response?.status);
        console.error('[Zo API] Verify error data:', JSON.stringify(error.response?.data));
        return {
          success: false,
          error: error.response?.data?.errors?.[0] || error.response?.data?.error || error.response?.data?.message || 'Invalid OTP',
        };
      }
      console.error('[Zo API] Unexpected verify error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<{ success: boolean; data?: ZoRefreshResponse; error?: string }> {
    try {
      const response = await this.client.post<ZoRefreshResponse>(
        '/api/v1/auth/token/refresh/',
        { refresh_token: refreshToken },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.errors?.[0] || 'Failed to refresh token',
        };
      }
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  async getProfile(accessToken: string): Promise<{ success: boolean; data?: ZoUser; error?: string }> {
    try {
      const response = await this.client.get<ZoUser>(
        '/api/v1/profile/me/',
        { headers: this.getHeaders(accessToken) }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.errors?.[0] || 'Failed to get profile',
        };
      }
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }
}

export const zoApiClient = new ZoAPIClient();
export { ZoAPIClient };
