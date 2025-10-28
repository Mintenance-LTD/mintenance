import { NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring and deployment verification
 *
 * @returns JSON response with health status and system info
 *
 * @example
 * GET /api/health
 * Response: { "status": "healthy", "timestamp": "2025-10-28T14:30:00.000Z", ... }
 */
export async function GET() {
  try {
    // Basic health check - can be extended with database/redis checks
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || 'unknown',
      nodeVersion: process.version,
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // If health check fails, return 503 Service Unavailable
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
