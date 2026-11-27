import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';

export const privateWorkUuid = z.string().uuid();
const revision = z.number().int().min(0).max(2_000_000_000);
const quoteVersion = z.number().int().min(1).max(2_000_000_000);
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export const agencyDispatchInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('quote'),
      revision,
      quotePence: z.number().int().min(0).max(100_000_000),
      quoteScope: z.string().trim().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      action: z.literal('dispatch'),
      revision,
      quoteVersion,
      contractorEmail: email,
    })
    .strict(),
  z.object({ action: z.literal('revoke'), revision, quoteVersion }).strict(),
  z.object({ action: z.literal('approve'), revision, quoteVersion }).strict(),
  z.object({ action: z.literal('reject'), revision, quoteVersion }).strict(),
  z.object({ action: z.literal('accept'), revision, quoteVersion }).strict(),
]);
export const agencyLandlordIdentityInput = z
  .object({ landlordEmail: email.nullable() })
  .strict();

const conflictMessages = new Set([
  'Reopen the repair before changing private work',
  'Revoke the current assignment before revising the quote',
  'Save an agency contractor work order before preparing a quote',
  'This quote can no longer be decided',
  'This work is already assigned',
  'This is no longer an agency contractor work order',
  'Current quote needs valid spending authority',
  'No current assignment to revoke',
  'This assignment cannot be accepted',
]);

export function assertPrivateWorkResult(
  error: { code: string; message: string } | null
) {
  if (!error) return;
  if (error.code === 'P0002')
    throw new NotFoundError('Private work or workspace record not found');
  if (error.code === '42501')
    throw new ForbiddenError(
      'This private work action is unavailable for your role'
    );
  if (error.code === '40001')
    throw new ConflictError(
      'This private work changed. Reload before continuing.'
    );
  if (error.code === '55000') {
    throw new ConflictError(
      conflictMessages.has(error.message)
        ? error.message
        : 'This private work action is not available right now.'
    );
  }
  if (['22023', '23514', '23502', '22P02'].includes(error.code)) {
    throw new BadRequestError(
      ['Unable to link this account', 'Unable to assign this account'].includes(
        error.message
      )
        ? error.message
        : 'Check the private work details'
    );
  }
  throw error;
}

export function privateWorkJson(body: unknown) {
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function privateDispatchFor(
  ticket: string,
  actor: string,
  command: z.infer<typeof agencyDispatchInput> | null
) {
  if (!privateWorkUuid.safeParse(ticket).success)
    throw new NotFoundError('Private work not found');
  const { data, error } = await serverSupabase.rpc('agency_private_dispatch', {
    p_ticket_id: ticket,
    p_actor_id: actor,
    p_command: command,
  });
  assertPrivateWorkResult(error);
  return privateWorkJson({ dispatch: data });
}
