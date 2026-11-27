import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';

const uuid = z.string().uuid();
const details = {
  displayName: z.string().trim().min(1).max(160),
  approvalLimitPence: z
    .number()
    .int()
    .min(0)
    .max(100_000_000)
    .nullable()
    .default(null),
  primaryManagerId: uuid.nullable().default(null),
  backupManagerId: uuid.nullable().default(null),
};
const properties = z.array(uuid).max(100);

function distinctAllocation(
  input: {
    primaryManagerId: string | null;
    backupManagerId: string | null;
    propertyIds: string[];
  },
  ctx: z.RefinementCtx
) {
  if (
    input.primaryManagerId &&
    input.primaryManagerId.toLowerCase() ===
      input.backupManagerId?.toLowerCase()
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['backupManagerId'],
      message: 'Choose different primary and backup managers.',
    });
  }
  if (
    new Set(input.propertyIds.map((id) => id.toLowerCase())).size !==
    input.propertyIds.length
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['propertyIds'],
      message: 'Choose each property only once.',
    });
  }
}
const createInput = z
  .object({ ...details, propertyIds: properties.default([]) })
  .strict()
  .superRefine(distinctAllocation);
const updateInput = z
  .object({
    ...details,
    propertyIds: properties,
    revision: z.number().int().min(1).max(2_000_000_000),
  })
  .strict()
  .superRefine(distinctAllocation);

export async function agencyLandlordResponse(
  orgId: string,
  actorId: string,
  landlordId: string | null,
  request: NextRequest | null
) {
  if (
    !uuid.safeParse(orgId).success ||
    (landlordId !== null && !uuid.safeParse(landlordId).success)
  ) {
    throw new NotFoundError('Agency workspace or landlord record not found');
  }
  let changes:
    | z.infer<typeof createInput>
    | z.infer<typeof updateInput>
    | null = null;
  if (request) {
    const input = landlordId ? updateInput : createInput;
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BadRequestError(parsed.error.issues[0].message);
    changes = parsed.data;
  }
  const { data, error } = await serverSupabase.rpc(
    'agency_landlord_directory',
    {
      p_org_id: orgId,
      p_actor_id: actorId,
      p_landlord_id: landlordId,
      p_changes: changes,
    }
  );
  if (error?.code === 'P0002') {
    throw new NotFoundError('Agency workspace or landlord record not found');
  }
  if (error?.code === '42501') {
    throw new ForbiddenError(
      'Only workspace owners and managers can edit landlord records'
    );
  }
  if (error?.code === '40001') {
    throw new ConflictError(
      'This landlord record changed. Reload before saving.'
    );
  }
  if (error?.code === '23505') {
    throw new ConflictError(
      'A selected property is already linked to another landlord.'
    );
  }
  if (error?.code === '22023') {
    // Only the known directory RPC's own validation failures, not raw PG
    // constraint names, database errors, or Supabase response details.
    const messages: Record<string, string> = {
      'Choose current staff from this workspace':
        'Choose current staff from this workspace.',
      'Choose distinct properties linked to this workspace':
        'Choose distinct properties linked to this workspace.',
    };
    throw new BadRequestError(
      messages[error.message] ?? 'Invalid landlord record'
    );
  }
  if (error) throw error;
  return NextResponse.json(data, {
    status: request && !landlordId ? 201 : 200,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
