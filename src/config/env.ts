import { z } from 'zod';

const envSchema = z.object({
  // Zo API (required at runtime)
  ZO_API_BASE_URL: z.string().url(),
  ZO_CLIENT_KEY: z.string().min(1),
  
  // PiSignage API (required at runtime)
  PISIGNAGE_API_URL: z.string().url(),
  PISIGNAGE_USERNAME: z.string().min(1),
  PISIGNAGE_PASSWORD: z.string().min(1),
  PISIGNAGE_TOKEN: z.string().optional(), // Pre-obtained token (bypasses OTP)
  
  // Database (required at runtime)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Session (required at runtime)
  SESSION_SECRET: z.string().min(32),
  
  // Optional
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

// Lazy singleton - only validates when first accessed at runtime
let _env: Env | null = null;

function getEnv(): Env {
  if (_env) return _env;
  
  // Skip validation during build time (static page generation)
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    // Return placeholder values for build time
    return {
      ZO_API_BASE_URL: 'https://placeholder.com',
      ZO_CLIENT_KEY: 'placeholder',
      PISIGNAGE_API_URL: 'https://placeholder.com',
      PISIGNAGE_USERNAME: 'placeholder',
      PISIGNAGE_PASSWORD: 'placeholder',
      NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder',
      SESSION_SECRET: 'placeholder-secret-at-least-32-chars-long',
      AWS_REGION: 'us-east-1',
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    } as Env;
  }
  
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    const missing = Object.keys(parsed.error.flatten().fieldErrors);
    console.error('❌ Missing environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  _env = parsed.data;
  return _env;
}

// Export as getter to enable lazy evaluation
export const env = new Proxy({} as Env, {
  get(_, prop: keyof Env) {
    return getEnv()[prop];
  },
});
