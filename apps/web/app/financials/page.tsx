import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { LegacyFinancialsView } from './LegacyFinancialsView';
import {
  MintEditorialFinancials,
  type FinancialsInvoiceRow,
  type FinancialsPaymentRow,
  type FinancialsStats,
  type FinancialsSubscriptionRow,
} from './MintEditorialFinancials';

export const metadata: Metadata = {
  title: 'Financials | Mintenance',
  description:
    'Manage your payments, subscriptions, invoices, and billing overview for property maintenance.',
};

interface InvoiceWithJob extends FinancialsInvoiceRow {
  job_id?: string;
  paid_date?: string;
  job?:
    | { id: string; homeowner_id: string }
    | Array<{ id: string; homeowner_id: string }>;
}

export default async function FinancialsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/financials');
  }

  // Redirect contractors
  if (user.role === 'contractor') {
    redirect('/contractor/finance');
  }

  // Fetch financial data in parallel. The legacy `payments` table has
  // 0 rows in production — all real money flows live in
  // `escrow_transactions` (verified live 2026-04-21 via Supabase MCP).
  // Pulling from `payments` gave users "£0.00 Total Spent" and
  // "No payments yet" on /financials even though /payments read escrow
  // and correctly showed their transactions. Bridge the two by
  // projecting escrow rows into the payments shape this page expects.
  const [paymentsResult, subscriptionsResult, jobsResult, invoicesResult] =
    await Promise.all([
      serverSupabase
        .from('escrow_transactions')
        .select(
          `
        id,
        amount,
        status,
        created_at,
        updated_at,
        released_at,
        refunded_at,
        job:jobs!escrow_transactions_job_id_fkey (
          id,
          title
        )
      `
        )
        .eq('payer_id', user.id)
        .order('created_at', { ascending: false }),
      serverSupabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      serverSupabase
        .from('jobs')
        .select('id, budget, status')
        .eq('homeowner_id', user.id),
      // Invoices received (from contractors) - linked through jobs.
      //
      // 2026-05-02 audit follow-up (review pass 5): the `contractor_invoices`
      // table was retired in the invoice unification — live schema has only
      // `invoices`. Contractor FK goes through `profiles`, not `users`, and
      // the column is `issue_date` (legacy alias `invoice_date` still populated
      // for older rows). This page silently returned 0 invoices for every
      // homeowner before that fix because PostgREST 404'd the missing table.
      serverSupabase
        .from('invoices')
        .select(
          `
        id,
        invoice_number,
        title,
        total_amount,
        status,
        invoice_date,
        issue_date,
        due_date,
        paid_date,
        job_id,
        contractor:profiles!invoices_contractor_id_fkey (
          id,
          first_name,
          last_name
        ),
        job:jobs!invoices_job_id_fkey (
          id,
          homeowner_id
        )
      `
        )
        .order('created_at', { ascending: false }),
    ]);

  // Extract data and handle errors gracefully
  const paymentsList = (paymentsResult.data || []) as FinancialsPaymentRow[];
  const subscriptionsList = (subscriptionsResult.data ||
    []) as FinancialsSubscriptionRow[];
  const jobsList = jobsResult.data || [];
  // Filter invoices to only show those for jobs owned by this homeowner.
  const invoicesList = ((invoicesResult.data || []) as InvoiceWithJob[]).filter(
    (invoice: InvoiceWithJob) => {
      const job = Array.isArray(invoice.job) ? invoice.job[0] : invoice.job;
      return job?.homeowner_id === user.id;
    }
  );

  // Calculate billing overview stats. Escrow statuses we fold into
  // "spent" = money the homeowner has actually parted with:
  //   held / release_pending / released / completed. Only `pending`
  //   (pre-charge) and `refunded` stay out. Matches the logic on
  //   /payments (see batch `5904938f`).
  const now = new Date();
  const SPENT_STATUSES = new Set([
    'held',
    'release_pending',
    'released',
    'completed',
  ]);
  const spentList = paymentsList.filter((p) =>
    SPENT_STATUSES.has(p.status || '')
  );
  const totalSpent = spentList.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );
  const spentCount = spentList.length;

  const pendingPayments = paymentsList
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // escrow_transactions has no due_date; the concept doesn't apply —
  // money is either in escrow or it isn't.
  const overduePayments = 0;

  const activeSubscriptions = subscriptionsList.filter(
    (s) => s.status === 'active'
  ).length;
  const overdueSubscriptions = subscriptionsList.filter((s) => {
    if (!s.next_billing_date || s.status !== 'active') return false;
    return new Date(s.next_billing_date) < now;
  }).length;

  const totalBudget = jobsList.reduce(
    (sum, job) => sum + (Number(job.budget) || 0),
    0
  );
  const pendingInvoices = invoicesList.filter((i) =>
    ['sent', 'viewed'].includes(i.status || '')
  ).length;
  const overdueInvoices = invoicesList.filter((i) => {
    if (!i.due_date || i.status === 'paid') return false;
    return new Date(i.due_date) < now && i.status !== 'paid';
  }).length;

  const stats: FinancialsStats = {
    totalSpent,
    spentCount,
    pendingPayments,
    overduePayments,
    activeSubscriptions,
    overdueSubscriptions,
    totalBudget,
    jobCount: jobsList.length,
    pendingInvoices,
    overdueInvoices,
  };

  // Phase-2 design rebrand — same hydration-safe cookie pattern used
  // on the dashboard and /jobs. Server-side check avoids a flash of
  // legacy chrome on first paint.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return (
      <MintEditorialFinancials
        stats={stats}
        subscriptions={subscriptionsList}
        invoices={invoicesList}
        payments={paymentsList}
      />
    );
  }

  return (
    <LegacyFinancialsView
      stats={stats}
      subscriptions={subscriptionsList}
      invoices={invoicesList}
      payments={paymentsList}
    />
  );
}
