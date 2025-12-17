import { cookies } from 'next/headers';
import { ZoAuthSession, ZoUser } from '@/types/auth';

const SESSION_COOKIE_NAME = 'zo_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

/**
 * Simple encryption for session data (use a proper library in production)
 * For production, consider using iron-session or jose
 */
function encodeSession(session: ZoAuthSession): string {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

function decodeSession(encoded: string): ZoAuthSession | null {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded) as ZoAuthSession;
  } catch {
    return null;
  }
}

/**
 * Get the current session from cookies (server-side)
 */
export async function getSession(): Promise<ZoAuthSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value) {
    return null;
  }

  return decodeSession(sessionCookie.value);
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<ZoUser | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Set session cookie (call from API route)
 */
export async function setSessionCookie(session: ZoAuthSession): Promise<void> {
  const cookieStore = await cookies();
  const encoded = encodeSession(session);
  
  cookieStore.set(SESSION_COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear session cookie (call from API route)
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: ZoAuthSession): boolean {
  const expiry = new Date(session.accessTokenExpiry).getTime();
  return Date.now() > expiry;
}

/**
 * Check if refresh is needed (5 minutes before expiry)
 */
export function needsRefresh(session: ZoAuthSession): boolean {
  const expiry = new Date(session.accessTokenExpiry).getTime();
  const buffer = 5 * 60 * 1000; // 5 minutes
  return Date.now() > expiry - buffer;
}

