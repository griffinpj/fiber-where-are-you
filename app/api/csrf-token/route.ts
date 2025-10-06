import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCSRFSecret, generateCSRFTokenWithHash } from '@/lib/csrf';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Check if we already have a CSRF secret in the cookie
    let csrfSecret = cookieStore.get('csrf-secret')?.value;
    
    // If no secret exists, generate a new one
    if (!csrfSecret) {
      csrfSecret = generateCSRFSecret();
    }
    
    // Generate a new token with the secret
    const csrfToken = generateCSRFTokenWithHash(csrfSecret);
    
    // Create response with the token
    const response = NextResponse.json({
      csrfToken,
      success: true,
    });
    
    // Set the CSRF secret cookie
    response.cookies.set('csrf-secret', csrfSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    
    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}