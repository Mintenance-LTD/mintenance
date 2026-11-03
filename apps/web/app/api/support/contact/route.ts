import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  supportCaseSchema,
  parseInput,
  createCase,
} from '@/lib/services/support/SupportService';
const schema = supportCaseSchema
  .omit({ jobId: true })
  .extend({
    email: z.string().email().max(254),
    website: z.string().max(0).optional(),
  });
export const POST = withApiHandler(
  // auth-check: ok — guests need help with signup; CSRF and a fail-closed IP rate limit protect this public form. It never automatically emails an unverified address.
  {
    auth: false,
    rateLimit: { maxRequests: 3, windowMs: 3600000, criticality: 'auth' },
  },
  async (req) => {
    const input = parseInput(schema, await req.json());
    const { email, website: _honeypot, ...body } = input;
    const id = await createCase(null, email, body);
    // No automatic email to an unverified address: avoids an email-bombing endpoint.
    return NextResponse.json(
      {
        id,
        message:
          'Request received. Keep your reference. We will respond by email; this is not a live emergency service.',
      },
      { status: 201 }
    );
  }
);
