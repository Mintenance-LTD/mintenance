import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { buildRetainedEvidencePacket } from '@/lib/privacy/retained-evidence-export';

const input = z
  .object({
    kind: z.enum(['contract', 'dispute']),
    recordId: z.string().uuid(),
    subjectId: z.string().uuid(),
    caseReference: z.string().trim().min(5).max(100),
    identityVerified: z.literal(true),
  })
  .strict();

export const POST = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    rateLimit: { maxRequests: 30 },
  },
  async (request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BadRequestError(
        'Provide the record, verified subject and case reference.'
      );
    const d = parsed.data;
    const table =
      d.kind === 'contract'
        ? 'retained_contract_records'
        : 'retained_dispute_records';
    const key = d.kind === 'contract' ? 'contract_id' : 'dispute_id';
    const { data, error } = await serverSupabase
      .from(table)
      .select('*')
      .eq(key, d.recordId)
      .contains('participant_ids', [d.subjectId])
      .maybeSingle();
    if (error)
      throw new InternalServerError('Unable to read archived evidence.');
    if (!data)
      throw new NotFoundError(
        'No retained record for that subject and reference.'
      );
    const packet = await buildRetainedEvidencePacket(d.kind, data);
    // user_id cannot reference a deleted profile. Keep the historical subject ID
    // in audit metadata, with the active administrator as the accountable actor.
    const { error: auditError } = await serverSupabase
      .from('gdpr_audit_log')
      .insert({
        user_id: null,
        performed_by: user.id,
        action: 'retained_evidence_export_prepared',
        table_name: table,
        record_id: d.recordId,
        new_values: {
          subject_id: d.subjectId,
          case_reference: d.caseReference,
          identity_verified: true,
          record_sha256: packet.record_sha256,
        },
      });
    if (auditError)
      throw new InternalServerError(
        'The export audit could not be saved. No download was completed.'
      );
    return new NextResponse(JSON.stringify(packet, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `attachment; filename="retained-${d.kind}-${d.recordId}.json"`,
      },
    });
  }
);
