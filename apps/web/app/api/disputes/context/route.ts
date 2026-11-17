import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { csrf: false },
  async (request, { user }) => {
    const id = z
      .string()
      .uuid()
      .safeParse(request.nextUrl.searchParams.get('escrowId'));
    if (!id.success)
      throw new BadRequestError('A valid payment reference is required');
    const { data, error } = await serverSupabase
      .from('escrow_transactions')
      .select('id,job_id,amount,status,payer_id,payee_id,jobs:job_id(title)')
      .eq('id', id.data)
      .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
      .maybeSingle();
    if (error)
      throw new InternalServerError(
        'Unable to load this payment. Please retry.'
      );
    if (!data) throw new NotFoundError('Payment not found or access denied');
    const job = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;
    return NextResponse.json({
      id: data.id,
      jobId: data.job_id,
      jobTitle: job?.title ?? 'Job',
      amount: Number(data.amount),
      status: data.status,
    });
  }
);
