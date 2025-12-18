import { NextResponse } from 'next/server';
import axios from 'axios';
import { env } from '@/config/env';

export async function GET() {
  const debug = {
    config: {
      apiUrl: env.PISIGNAGE_API_URL,
      username: env.PISIGNAGE_USERNAME,
      passwordSet: !!env.PISIGNAGE_PASSWORD,
      passwordLength: env.PISIGNAGE_PASSWORD?.length ?? 0,
      tokenSet: !!process.env.PISIGNAGE_TOKEN,
      tokenLength: process.env.PISIGNAGE_TOKEN?.length ?? 0,
    },
    authTest: null as { success: boolean; token?: string; error?: string } | null,
    playersTest: null as { success: boolean; count?: number; error?: string } | null,
  };

  // Check if pre-configured token exists
  const preToken = process.env.PISIGNAGE_TOKEN;
  
  if (preToken) {
    // Use pre-configured token
    debug.authTest = {
      success: true,
      token: preToken.substring(0, 30) + '... (pre-configured)',
    };
    
    // Test players with pre-configured token
    try {
      const playersResponse = await axios.get(`${env.PISIGNAGE_API_URL}/players`, {
        headers: { 'x-access-token': preToken },
        params: { per_page: 100 },
        timeout: 10000,
      });

      const players = playersResponse.data?.data?.objects || playersResponse.data?.objects || [];
      debug.playersTest = {
        success: true,
        count: players.length,
      };
    } catch (playersError) {
      debug.playersTest = {
        success: false,
        error: playersError instanceof Error ? playersError.message : 'Unknown error',
      };
    }
  } else {
    // Test auth with username/password
    try {
      const authResponse = await axios.post(`${env.PISIGNAGE_API_URL}/session`, {
        email: env.PISIGNAGE_USERNAME,
        password: env.PISIGNAGE_PASSWORD,
        getToken: true,
      }, {
        timeout: 10000,
      });

      debug.authTest = {
        success: true,
        token: authResponse.data.token?.substring(0, 30) + '...',
      };

      // If auth succeeded, test players
      try {
        const playersResponse = await axios.get(`${env.PISIGNAGE_API_URL}/players`, {
          headers: { 'x-access-token': authResponse.data.token },
          params: { per_page: 100 },
          timeout: 10000,
        });

        const players = playersResponse.data?.data?.objects || playersResponse.data?.objects || [];
        debug.playersTest = {
          success: true,
          count: players.length,
        };
      } catch (playersError) {
        debug.playersTest = {
          success: false,
          error: playersError instanceof Error ? playersError.message : 'Unknown error',
        };
      }

    } catch (authError) {
      if (axios.isAxiosError(authError)) {
        const errData = authError.response?.data;
        debug.authTest = {
          success: false,
          error: `${authError.response?.status}: ${JSON.stringify(errData) || authError.message}`,
        };
        // Add hint if OTP is required
        if (errData?.reason === 'location' || errData?.provider === 'e-otp') {
          (debug as Record<string, unknown>).hint = 'PiSignage requires OTP from new location. Get a token from browser and set PISIGNAGE_TOKEN env var.';
        }
      } else {
        debug.authTest = {
          success: false,
          error: authError instanceof Error ? authError.message : 'Unknown error',
        };
      }
    }
  }

  return NextResponse.json(debug);
}

