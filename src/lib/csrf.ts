import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-key-change-in-production';
const CSRF_COOKIE_NAME = 'csrf-secret';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateCSRFSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createCSRFHash(token: string, secret: string): string {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${token}:${secret}`)
    .digest('hex');
}

export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  try {
    // Get CSRF token from header or body
    const csrfToken = request.headers.get('x-csrf-token') || 
                     request.headers.get('csrf-token');
    
    if (!csrfToken) {
      return false;
    }

    // Get CSRF secret from cookie
    const cookieStore = await cookies();
    const csrfSecret = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    
    if (!csrfSecret) {
      return false;
    }

    // Get provided hash from the token (format: token:hash)
    const [token, providedHash] = csrfToken.split(':');
    
    if (!token || !providedHash) {
      return false;
    }

    // Create expected hash using the token and secret
    const expectedHash = createCSRFHash(token, csrfSecret);

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(providedHash, 'hex')
    );
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

export function generateCSRFTokenWithHash(secret: string): string {
  const token = generateCSRFToken();
  const hash = createCSRFHash(token, secret);
  return `${token}:${hash}`;
}

export async function setCSRFCookie(secret: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}