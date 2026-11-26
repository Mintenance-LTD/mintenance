import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';

const pence = z.number().int().min(0).max(100_000_000).nullable();
const reference = z.string().trim().min(1).max(120).nullable();

const workOrderInput = z
  .object({
    revision: z.number().int().min(0).max(2_000_000_000),
    arrangement: z.enum(['agency_contractor', 'arranged_outside']),
    contractorName: z.string().trim().min(1).max(160),
    quotedPence: pence,
    approvedPence: pence,
    approvalReference: reference,
    invoicedPence: pence,
    invoiceReference: reference,
    paidPence: pence,
    paymentReference: reference,
    completionNote: z.string().trim().min(1).max(3000).nullable(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      (input.approvedPence === null) !== (input.approvalReference === null) ||
      (input.approvedPence !== null &&
        (input.quotedPence === null || input.approvedPence > input.quotedPence))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['approvedPence'],
        message:
          'Record the approval reference and an amount within the recorded quote.',
      });
    }
    if ((input.invoicedPence === null) !== (input.invoiceReference === null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['invoicedPence'],
        message: 'Record the invoice amount and reference together.',
      });
    }
    if (
      (input.paidPence === null) !== (input.paymentReference === null) ||
      (input.paidPence !== null &&
        (input.invoicedPence === null || input.paidPence > input.invoicedPence))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['paidPence'],
        message:
          'Record the payment reference and an amount within the invoice.',
      });
    }
  });

const ticketId = z.string().uuid();

async function workOrderFor(
  id: string,
  actorId: string,
  changes: z.infer<typeof workOrderInput> | null
) {
  if (!ticketId.safeParse(id).success)
    throw new NotFoundError('Ticket not found');

  // The verified session supplies actor identity. The SQL function checks
  // current workspace membership and writes everything in one transaction.
  const { data: workOrder, error } = await serverSupabase.rpc(
    'agency_repair_work_order',
    { p_ticket_id: id, p_actor_id: actorId, p_changes: changes }
  );
  if (error?.code === 'P0002') throw new NotFoundError('Ticket not found');
  if (error?.code === '40001') {
    throw new ConflictError(
      'This work order changed. Reload it before saving.'
    );
  }
  if (error && ['22023', '23514', '23502', '22P02'].includes(error.code)) {
    throw new BadRequestError('Invalid work order details');
  }
  if (error) throw error;

  return NextResponse.json(
    { workOrder: workOrder ?? null },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const blocked = await requirePortfolioModeSubscription(request, user.id);
    if (blocked) return blocked;
    return workOrderFor(params.id, user.id, null);
  }
);

export const PUT = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const blocked = await requirePortfolioModeSubscription(request, user.id);
    if (blocked) return blocked;
    const parsed = workOrderInput.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0].message);
    }
    return workOrderFor(params.id, user.id, parsed.data);
  }
);
