import { NextRequest, NextResponse } from 'next/server';
import { zoApiClient } from '@/lib/zo-api/client';
import { setSessionCookie } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';
import { z } from 'zod';

const verifyRequestSchema = z.object({
  mobile_country_code: z.string().min(1),
  mobile_number: z.string().min(10),
  otp: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifyRequestSchema.parse(body);

    const deviceId = request.headers.get('x-device-id');
    const deviceSecret = request.headers.get('x-device-secret');

    if (deviceId && deviceSecret) {
      zoApiClient.setDeviceCredentials({ deviceId, deviceSecret });
    }

    const result = await zoApiClient.verifyOTP({
      mobile_country_code: validated.mobile_country_code,
      mobile_number: validated.mobile_number,
      otp: validated.otp,
    });

    if (result.success && result.data) {
      const loginData = result.data;

      const session = {
        accessToken: loginData.access_token,
        refreshToken: loginData.refresh_token,
        accessTokenExpiry: loginData.access_token_expiry,
        refreshTokenExpiry: loginData.refresh_token_expiry,
        deviceId: loginData.device_id,
        deviceSecret: loginData.device_secret,
        user: loginData.user,
      };

      // Create or update user record in database
      try {
        await supabase.from('users').upsert({
          zo_user_id: session.user.id,
          phone_number: session.user.mobile_number,
          first_name: session.user.first_name,
          last_name: session.user.last_name,
          email: session.user.email_address,
          membership: session.user.membership,
          roles: session.user.roles || [],
          access_groups: session.user.access_groups,
          last_login: new Date().toISOString(),
        }, {
          onConflict: 'zo_user_id'
        });
      } catch {
        // DB unavailable - continue with login
      }

      await setSessionCookie(session);

      return NextResponse.json({
        success: true,
        data: {
          user: session.user,
          deviceId: session.deviceId,
          deviceSecret: session.deviceSecret,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: result.error || 'Invalid or expired OTP',
        },
      },
      { status: 401 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
