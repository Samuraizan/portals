import { NextRequest, NextResponse } from 'next/server';
import { zoApiClient } from '@/lib/zo-api/client';
import { z } from 'zod';

const otpRequestSchema = z.object({
  mobile_country_code: z.string().min(1, 'Country code is required'),
  mobile_number: z.string().min(8, 'Phone number must be at least 8 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[OTP] Request body:', body);
    
    const validated = otpRequestSchema.parse(body);
    console.log('[OTP] Validated:', validated);

    const deviceId = request.headers.get('x-device-id');
    const deviceSecret = request.headers.get('x-device-secret');

    if (deviceId && deviceSecret) {
      zoApiClient.setDeviceCredentials({ deviceId, deviceSecret });
    }

    console.log('[OTP] Calling Zo API...');
    const result = await zoApiClient.sendOTP({
      mobile_country_code: validated.mobile_country_code,
      mobile_number: validated.mobile_number,
    });
    console.log('[OTP] Zo API result:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'OTP sent successfully',
        deviceId: result.deviceId,
        deviceSecret: result.deviceSecret,
      });
    }

    console.error('[OTP] Zo API error:', result.error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OTP_SEND_FAILED',
          message: result.error || 'Failed to send OTP',
        },
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[OTP] Exception:', error);
    
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: firstError?.message || 'Invalid request data',
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
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
