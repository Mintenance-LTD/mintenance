/**
 * Health check endpoint for maintenance detection service
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
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
    console.error('Health check failed:', error);
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