import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';

const limitSchema = z.coerce.number().int().min(1).max(50);

export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async (request) => {
    const limit = limitSchema.safeParse(request.nextUrl.searchParams.get('limit') ?? 10);
    if (!limit.success) {
      return NextResponse.json({ error: 'limit must be an integer between 1 and 50' }, { status: 400 });
    }
    // Raw searches may contain addresses or other private information. Keep this
    // optional surface empty until a reviewed, privacy-safe aggregate exists.
    return NextResponse.json({ trending: [] });
  },
);