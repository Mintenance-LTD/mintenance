import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { readExportRows } from '@/lib/privacy/read-export-rows';

const input = z
  .object({
    subjectId: z.string().uuid(),
    caseReference: z.string().trim().min(5).max(100),
    identityVerified: z.literal(true),
  })
  .strict();

export const POST = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    rateLimit: { maxRequests: 5 },
  },
  async (request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BadRequestError(
        'Provide a verified subject and case reference.'
      );
    const d = parsed.data;
    const [contracts, disputes] = await Promise.all([
      readExportRows(
        () =>
          serverSupabase
            .from('retained_contract_records')
            .select('id:contract_id,archived_at')
            .contains('participant_ids', [d.subjectId]),
        2000,
        'contract_id'
      ),
      readExportRows(
        () =>
          serverSupabase
            .from('retained_dispute_records')
            .select('id:dispute_id,archived_at')
            .contains('participant_ids', [d.subjectId]),
        2000,
        'dispute_id'
      ),
    ]);
    if (contracts.error || disputes.error)
      throw new InternalServerError(
        'The full retained inventory is unavailable or requires offline processing. No complete export was prepared.'
      );
    const records = [
      ...(contracts.data ?? []).map((row) => ({
        kind: 'contract' as const,
        recordId: row.id as string,
        archivedAt: row.archived_at,
      })),
      ...(disputes.data ?? []).map((row) => ({
        kind: 'dispute' as const,
        recordId: row.id as string,
        archivedAt: row.archived_at,
      })),
    ];
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ subjectId: d.subjectId, records }))
      .digest('hex');
    const { error } = await serverSupabase.from('gdpr_audit_log').insert({
      user_id: null,
      performed_by: user.id,
      action: 'retained_evidence_inventory_prepared',
      new_values: {
        subject_id: d.subjectId,
        case_reference: d.caseReference,
        identity_verified: true,
        records: records.length,
        fingerprint,
      },
    });
    if (error)
      throw new InternalServerError(
        'The inventory audit could not be saved. Please retry.'
      );
    return NextResponse.json(
      {
        subjectId: d.subjectId,
        records,
        fingerprint,
        generatedAt: new Date().toISOString(),
        scope:
          'Retained contracts and disputes only; other personal records, backups and processor copies are outside this inventory.',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);
