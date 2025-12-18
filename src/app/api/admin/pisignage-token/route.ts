import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';
import { hasPermission } from '@/lib/rbac/permissions';
import axios from 'axios';
import { env } from '@/config/env';

// GET: Check current token status
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canManageUsers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Get token from database
    const { data: config, error } = await supabase
      .from('app_config')
      .select('*')
      .eq('key', 'pisignage_token')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          hasToken: false,
          message: 'No token configured. Use POST to set one.',
        },
      });
    }

    // Decode JWT to check expiry
    const token = config.value;
    let expiresAt: Date | null = null;
    let isExpired = false;
    let expiresIn: string | null = null;

    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (payload.exp) {
        expiresAt = new Date(payload.exp * 1000);
        isExpired = expiresAt < new Date();
        const diff = expiresAt.getTime() - Date.now();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          expiresIn = `${hours}h ${minutes}m`;
        }
      }
    } catch {
      // Failed to decode JWT
    }

    // Test if token works
    let isValid = false;
    try {
      const response = await axios.get(`${env.PISIGNAGE_API_URL}/players`, {
        headers: { 'x-access-token': token },
        params: { per_page: 1 },
        timeout: 5000,
      });
      isValid = response.status === 200;
    } catch {
      isValid = false;
    }

    return NextResponse.json({
      success: true,
      data: {
        hasToken: true,
        isValid,
        isExpired,
        expiresAt: expiresAt?.toISOString(),
        expiresIn,
        updatedAt: config.updated_at,
      },
    });

  } catch (error) {
    console.error('Get PiSignage token status error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get token status' } },
      { status: 500 }
    );
  }
}

// POST: Request OTP or set token with OTP
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canManageUsers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, otp } = body;

    if (action === 'request_otp') {
      // Request OTP from PiSignage
      try {
        await axios.post(`${env.PISIGNAGE_API_URL}/session`, {
          email: env.PISIGNAGE_USERNAME,
          password: env.PISIGNAGE_PASSWORD,
          getToken: true,
        });

        // If we get here without error, no OTP needed (shouldn't happen in prod)
        return NextResponse.json({
          success: true,
          message: 'Authentication succeeded without OTP (unexpected)',
        });

      } catch (error) {
        if (axios.isAxiosError(error)) {
          const data = error.response?.data;
          if (data?.reason === 'location' || data?.provider === 'e-otp') {
            return NextResponse.json({
              success: true,
              message: 'OTP sent to email. Use action "verify_otp" with the OTP.',
              otpRequired: true,
            });
          }
        }
        throw error;
      }
    }

    if (action === 'verify_otp' && otp) {
      // Verify OTP and get token
      const response = await axios.post(`${env.PISIGNAGE_API_URL}/session`, {
        email: env.PISIGNAGE_USERNAME,
        password: env.PISIGNAGE_PASSWORD,
        getToken: true,
        otp: otp,
      });

      const token = response.data.token;
      if (!token) {
        throw new Error('No token in response');
      }

      // Store token in database
      const { error: upsertError } = await supabase
        .from('app_config')
        .upsert({
          key: 'pisignage_token',
          value: token,
          updated_at: new Date().toISOString(),
          updated_by: session.user.mobile_number,
        }, {
          onConflict: 'key',
        });

      if (upsertError) {
        throw upsertError;
      }

      // Decode JWT to get expiry
      let expiresAt: Date | null = null;
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.exp) {
          expiresAt = new Date(payload.exp * 1000);
        }
      } catch {
        // Failed to decode
      }

      return NextResponse.json({
        success: true,
        message: 'Token saved successfully',
        data: {
          expiresAt: expiresAt?.toISOString(),
        },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action. Use "request_otp" or "verify_otp"' } },
      { status: 400 }
    );

  } catch (error) {
    console.error('PiSignage token error:', error);
    const message = axios.isAxiosError(error) 
      ? error.response?.data?.message || error.message 
      : error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

