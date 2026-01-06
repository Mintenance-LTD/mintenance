/**
 * Health check endpoint for maintenance detection service
 */

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';

export async function GET() {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Since onnxruntime-web only works in the browser, we'll return a basic health check
    // The actual model health check should be done client-side
    return NextResponse.json({
      status: 'ok',
      service: 'maintenance-detection',
      timestamp: new Date().toISOString(),
      message: 'Service is running. Model health checks should be performed client-side.',
      loaded: false,
      url: process.env.NEXT_PUBLIC_YOLO_MODEL_URL || 'https://ukrjudtlvapiajkjbcrd.supabase.co/storage/v1/object/public/yolo-models/maintenance-v1.0.onnx',
      ready: false
    });
  } catch (error) {
    logger.error('Health check failed:', error', [object Object], { service: 'api' });
    return NextResponse.json(
      {
        status: 'error',
        service: 'maintenance-detection',
        error: 'Failed to check service health',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}