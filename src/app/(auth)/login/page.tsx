'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneInput } from '@/components/auth/phone-input';
import { OTPInput } from '@/components/auth/otp-input';
import { useAuth } from '@/components/auth/auth-provider';

type Step = 'phone' | 'otp';

interface PhoneData {
  countryCode: string;
  phoneNumber: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phoneData, setPhoneData] = useState<PhoneData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Generate device ID on mount
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('zo_device_id');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    } else {
      const newDeviceId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('zo_device_id', newDeviceId);
      setDeviceId(newDeviceId);
    }
  }, []);

  const handleSendOTP = async (countryCode: string, phoneNumber: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-device-secret': localStorage.getItem('zo_device_secret') || '',
        },
        body: JSON.stringify({
          mobile_country_code: countryCode,
          mobile_number: phoneNumber,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store device credentials returned from backend
        if (data.deviceId && data.deviceSecret) {
          localStorage.setItem('zo_device_id', data.deviceId);
          localStorage.setItem('zo_device_secret', data.deviceSecret);
          setDeviceId(data.deviceId);
        }
        setPhoneData({ countryCode, phoneNumber });
        setStep('otp');
      } else {
        setError(data.error?.message || 'Failed to send OTP');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!phoneData) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-device-secret': localStorage.getItem('zo_device_secret') || '',
        },
        body: JSON.stringify({
          mobile_country_code: phoneData.countryCode,
          mobile_number: phoneData.phoneNumber,
          otp,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store device credentials
        localStorage.setItem('zo_device_id', data.data.deviceId);
        localStorage.setItem('zo_device_secret', data.data.deviceSecret);

        // Update auth context
        login({
          accessToken: '',
          refreshToken: '',
          accessTokenExpiry: '',
          refreshTokenExpiry: '',
          deviceId: data.data.deviceId,
          deviceSecret: data.data.deviceSecret,
          user: data.data.user,
        });

        // Redirect to dashboard
        router.push('/');
      } else {
        setError(data.error?.message || 'Invalid OTP');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!phoneData) return;
    await handleSendOTP(phoneData.countryCode, phoneData.phoneNumber);
  };

  const formatPhoneDisplay = () => {
    if (!phoneData) return '';
    const { countryCode, phoneNumber } = phoneData;
    return `${countryCode} (${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h.01" />
              <path d="M17 7h.01" />
              <path d="M7 17h.01" />
              <path d="M17 17h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Zo Portals</h1>
          <p className="mt-2 text-muted-foreground">
            {step === 'phone'
              ? 'Sign in to manage your displays'
              : 'Enter verification code'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-lg">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <PhoneInput onSubmit={handleSendOTP} isLoading={isLoading} />
          ) : (
            <div>
              <button
                onClick={() => {
                  setStep('phone');
                  setError(null);
                }}
                className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                Change number
              </button>
              <OTPInput
                onComplete={handleVerifyOTP}
                onResend={handleResendOTP}
                isLoading={isLoading}
                phoneDisplay={formatPhoneDisplay()}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          By continuing, you agree to Zo&apos;s{' '}
          <a href="#" className="underline hover:text-foreground">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-foreground">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

