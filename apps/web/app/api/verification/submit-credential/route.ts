/**
 * POST /api/verification/submit-credential
 *
 * Contractor submits a trade-register credential for verification.
 * Calls CredentialRegisterService.verify() — today this returns
 * manual_review for every provider, so the row lands in the admin
 * queue. When the real APIs are wired the same flow auto-promotes to
 * verified/rejected.
 *
 * R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { CredentialRegisterService } from '@/lib/services/verification/CredentialRegisterService';
import { BadRequestError } from '@/lib/errors/api-error';

const BodySchema = z.object({
  register: z.enum(['gas_safe', 'niceic', 'trustmark', 'other']),
  registration_number: z.string().min(3).max(64),
  evidence_path: z.string().min(1).max(512).nullable().optional(),
});

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const raw = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError('Invalid submission payload');
    }

    const { register, registration_number, evidence_path } = parsed.data;
    const normalizedNumber = registration_number.trim();

    // Call the provider — today this is always manual_review. When API
    // agreements land the provider returns 'verified' / 'rejected' and
    // the row below short-circuits the admin queue.
    const result = await CredentialRegisterService.verify(
      register,
      normalizedNumber
    );

    const initialStatus =
      result.status === 'verified'
        ? 'verified'
        : result.status === 'rejected'
          ? 'rejected'
          : 'pending';

    const row = {
      user_id: user.id,
      register,
      registration_number: normalizedNumber,
      status: initialStatus,
      evidence_path: evidence_path ?? null,
      raw_response: (result.raw as unknown as object) ?? null,
      verified_at:
        result.status === 'verified' ? new Date().toISOString() : null,
      expires_at: result.expiresAt ?? null,
      rejected_reason:
        result.status === 'rejected' ? (result.reason ?? null) : null,
    };

    const { data, error } = await serverSupabase
      .from('credential_verifications')
      .insert(row)
      .select('id, status')
      .single();

    if (error) {
      logger.warn('Failed to record credential submission', {
        service: 'verification/submit-credential',
        userId: user.id,
        register,
        err: error.message,
      });
      // Collapse the RLS-unique "already exists" case to a friendly 400.
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error:
              'You already have a pending or verified record for that registration number.',
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to record submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      auto_decided: result.status !== 'manual_review',
    });
  }
);
