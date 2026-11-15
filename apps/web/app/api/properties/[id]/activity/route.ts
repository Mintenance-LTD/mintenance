import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { getPropertyForManagement } from '@/lib/services/property-team/property-management-access';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { roles: ['homeowner'], csrf: false },
  async (request, { user, params }) => {
    const property = await getPropertyForManagement(user, params.id, 'view');
    // This combined feed includes financial/document metadata; team access remains separate.
    if (property.owner_id !== user.id)
      throw new ForbiddenError(
        'Only the property owner can view the combined history'
      );
    const offset = Number(request.nextUrl.searchParams.get('offset') || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000)
      throw new BadRequestError('Invalid activity page');
    const take = offset + 26;
    const paymentQuery = (date: string) =>
      db
        .from('escrow_transactions')
        .select(
          'id,job_id,status,created_at,funded_at,released_at,job:jobs!inner(property_id)'
        )
        .eq('job.property_id', params.id)
        .eq('payer_id', user.id)
        .not(date, 'is', null)
        .order(date, { ascending: false })
        .order('id')
        .limit(take);
    const [
      createdJobs,
      completedJobs,
      documents,
      inspections,
      createdPayments,
      fundedPayments,
      releasedPayments,
      messages,
    ] = await Promise.all([
      db
        .from('jobs')
        .select('id,title,created_at')
        .eq('property_id', params.id)
        .order('created_at', { ascending: false })
        .order('id')
        .limit(take),
      db
        .from('jobs')
        .select('id,title,completed_at')
        .eq('property_id', params.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .order('id')
        .limit(take),
      db
        .from('property_document_files')
        .select('id,name,created_at')
        .eq('property_id', params.id)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .order('id')
        .limit(take),
      db
        .from('property_inspection_reports')
        .select('id,title,created_at')
        .eq('property_id', params.id)
        .order('created_at', { ascending: false })
        .order('id')
        .limit(take),
      paymentQuery('created_at'),
      paymentQuery('funded_at'),
      paymentQuery('released_at'),
      db
        .from('messages')
        .select('id,job_id,created_at,job:jobs!inner(property_id)')
        .eq('job.property_id', params.id)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .order('id')
        .limit(take),
    ]);
    if (
      [
        createdJobs,
        completedJobs,
        documents,
        inspections,
        createdPayments,
        fundedPayments,
        releasedPayments,
        messages,
      ].some((result) => result.error)
    )
      throw new Error('Unable to load complete property history');
    type Event = {
      id: string;
      title: string;
      date: string;
      href: string;
      kind: string;
    };
    const events: Event[] = [];
    for (const job of createdJobs.data || []) {
      events.push({
        id: `job-${job.id}`,
        title: `Job created: ${job.title}`,
        date: job.created_at,
        href: `/jobs/${job.id}`,
        kind: 'job',
      });
    }
    for (const job of completedJobs.data || [])
      if (job.completed_at)
        events.push({
          id: `complete-${job.id}`,
          title: `Work completed: ${job.title}`,
          date: job.completed_at,
          href: `/jobs/${job.id}`,
          kind: 'job',
        });
    for (const doc of documents.data || [])
      events.push({
        id: `document-${doc.id}`,
        title: `Document added: ${doc.name}`,
        date: doc.created_at,
        href: `/properties/${params.id}?tab=documents`,
        kind: 'document',
      });
    for (const report of inspections.data || [])
      events.push({
        id: `inspection-${report.id}`,
        title: `Inspection recorded: ${report.title}`,
        date: report.created_at,
        href: `/properties/${params.id}?tab=manage`,
        kind: 'inspection',
      });
    const payments = new Map(
      [
        ...(createdPayments.data || []),
        ...(fundedPayments.data || []),
        ...(releasedPayments.data || []),
      ].map((payment) => [payment.id, payment])
    );
    for (const payment of payments.values()) {
      events.push({
        id: `payment-${payment.id}`,
        title: 'Payment record created',
        date: payment.created_at,
        href: `/payments?paymentId=${payment.id}`,
        kind: 'payment',
      });
      if (payment.funded_at)
        events.push({
          id: `funded-${payment.id}`,
          title: 'Payment funded',
          date: payment.funded_at,
          href: `/payments?paymentId=${payment.id}`,
          kind: 'payment',
        });
      if (payment.released_at)
        events.push({
          id: `released-${payment.id}`,
          title: 'Payment released',
          date: payment.released_at,
          href: `/payments?paymentId=${payment.id}`,
          kind: 'payment',
        });
    }
    for (const message of messages.data || [])
      events.push({
        id: `message-${message.id}`,
        title: 'Job message sent',
        date: message.created_at,
        href: `/messages?jobId=${message.job_id}`,
        kind: 'message',
      });
    const sorted = events
      .filter((event) => Number.isFinite(Date.parse(event.date)))
      .sort(
        (a, b) =>
          Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id)
      );
    return NextResponse.json(
      {
        events: sorted.slice(offset, offset + 25),
        hasMore: sorted.length > offset + 25,
        limitReached: offset >= 1000,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);
