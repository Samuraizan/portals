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
    const validated = otpRequestSchema.parse(body);

    const deviceId = request.headers.get('x-device-id');
    const deviceSecret = request.headers.get('x-device-secret');

    if (deviceId && deviceSecret) {
      zoApiClient.setDeviceCredentials({ deviceId, deviceSecret });
    }

    const result = await zoApiClient.sendOTP({
      mobile_country_code: validated.mobile_country_code,
      mobile_number: validated.mobile_number,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'OTP sent successfully',
        deviceId: result.deviceId,
        deviceSecret: result.deviceSecret,
      });
    }

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
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
