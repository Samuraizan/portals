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
    },
    authTest: null as { success: boolean; token?: string; error?: string } | null,
    playersTest: null as { success: boolean; count?: number; error?: string } | null,
  };

  // Test auth directly
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
      debug.authTest = {
        success: false,
        error: `${authError.response?.status}: ${JSON.stringify(authError.response?.data) || authError.message}`,
      };
    } else {
      debug.authTest = {
        success: false,
        error: authError instanceof Error ? authError.message : 'Unknown error',
      };
    }
  }

  return NextResponse.json(debug);
}

