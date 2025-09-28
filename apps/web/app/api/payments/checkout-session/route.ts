import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

const bodySchema = z.object({
  amount: z.number().int().positive(),
  jobId: z.string().uuid(),
  contractorId: z.string().uuid(),
  currency: z.string().trim().min(3).max(10).optional().default('usd'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { amount, jobId, contractorId, currency } = parsed.data;
    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, title, budget, homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error('[API] checkout-session job lookup error', jobError);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const isHomeowner = jobData.homeowner_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isHomeowner && !isAdmin) {
      return NextResponse.json({ error: 'Only the homeowner can initiate payment checkout' }, { status: 403 });
    }

    if (!jobData.contractor_id) {
      return NextResponse.json({ error: 'Job does not have an assigned contractor' }, { status: 400 });
    }

    if (jobData.contractor_id !== contractorId) {
      return NextResponse.json({ error: 'Contractor does not match job assignment' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    const metadata = {
      jobId,
      jobTitle: jobData.title ?? 'Untitled Job',
      contractorId,
      payerId: user.id,
    };

    const { data: paymentIntent, error: functionError } = await serverSupabase
      .functions
      .invoke('create-payment-intent', {
        body: {
          amount,
          currency,
          metadata,
          jobId,
          contractorId,
        },
      });

    if (functionError) {
      console.error('[API] checkout-session function error', functionError);
      return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 502 });
    }

    if (!paymentIntent?.client_secret) {
      return NextResponse.json({ error: 'Payment provider did not return a client secret' }, { status: 502 });
    }

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount ?? amount,
      currency: paymentIntent.currency ?? currency,
      status: paymentIntent.status,
    });
  } catch (err) {
    console.error('[API] checkout-session POST error', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
