import { NextResponse } from 'next/server';
import { zoApiClient } from '@/lib/zo-api/client';
import { getSession, setSessionCookie } from '@/lib/auth/session';

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_SESSION',
            message: 'No session found',
          },
        },
        { status: 401 }
      );
    }

    // Set device credentials
    zoApiClient.setDeviceCredentials({
      deviceId: session.deviceId,
      deviceSecret: session.deviceSecret,
    });

    const result = await zoApiClient.refreshToken(session.refreshToken);

    if (result.success && result.data) {
      // Update session with new tokens
      const updatedSession = {
        ...session,
        accessToken: result.data.access,
        refreshToken: result.data.refresh,
        accessTokenExpiry: result.data.access_expiry,
        refreshTokenExpiry: result.data.refresh_expiry,
      };

      await setSessionCookie(updatedSession);

      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: result.error || 'Failed to refresh token',
        },
      },
      { status: 401 }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
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

