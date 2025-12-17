import { z } from 'zod';

const envSchema = z.object({
  // Zo API (required)
  ZO_API_BASE_URL: z.string().url(),
  ZO_CLIENT_KEY: z.string().min(1),
  
  // PiSignage API (required)
  PISIGNAGE_API_URL: z.string().url(),
  PISIGNAGE_USERNAME: z.string().min(1),
  PISIGNAGE_PASSWORD: z.string().min(1),
  
  // Database (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Session (required)
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

function getEnv() {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    const missing = Object.keys(parsed.error.flatten().fieldErrors);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return parsed.data;
}

export const env = getEnv();
export type Env = z.infer<typeof envSchema>;
