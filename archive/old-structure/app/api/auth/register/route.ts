import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { checkApiRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = await checkApiRateLimit(request);

    if (!rateLimitResult.allowed) {
      const headers = createRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers
        }
      );
    }

    const body = await request.json();
    const { email, password, first_name, last_name, role, phone } = body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { error: 'Email, password, first name, last name, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['homeowner', 'contractor', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be homeowner, contractor, or admin' },
        { status: 400 }
      );
    }

    // Register user
    const result = await authManager.register({
      email,
      password,
      first_name,
      last_name,
      role,
      phone
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Create response
    const response = NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: result.user!.id,
          email: result.user!.email,
          role: result.user!.role,
          firstName: result.user!.first_name,
          lastName: result.user!.last_name,
          emailVerified: result.user!.email_verified
        }
      },
      { status: 201 }
    );

    // Add rate limit headers to successful response
    const headers = createRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Registration error:', error);

    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}