import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * Health check endpoint for maintenance detection service
 */
export const GET = withApiHandler({ auth: false }, async () => {
  return NextResponse.json({
    status: 'ok',
    service: 'maintenance-detection',
    timestamp: new Date().toISOString(),
    message: 'Service is running. Model health checks should be performed client-side.',
    loaded: false,
    url: process.env.NEXT_PUBLIC_YOLO_MODEL_URL ||
      `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/yolo-models/maintenance-v1.0.onnx`,
    ready: false,
  });
});
