import type { Metadata } from 'next';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InvoiceManagementClient } from './components/InvoiceManagementClient';

export const metadata: Metadata = {
  title: 'Contractor Invoice Management | Mintenance',
  description:
    'Create, send, and track invoices for your maintenance jobs. Manage outstanding payments and billing.',
};

// 2026-04-30 audit P0-5: previously read from a `contractor_invoices`
// table that doesn't exist in the live schema (`invoices` is the
// canonical table that the API + mobile already use). The earlier
// `client_name` column it tried to project doesn't exist either —
// invoices store client info on related rows (clients/jobs) rather
// than denormalised onto the invoice row.
type InvoiceRow = {
  id: string;
  invoice_number: string;
  total_amount: number | string | null;
  status: 'draft' | 'sent' | 'overdue' | 'paid';
  due_date: string;
  created_at: string;
  updated_at?: string | null;
  job_id?: string | null;
  client_id?: string | null;
};

const isSameMonth = (dateA: Date, dateB: Date) =>
  dateA.getFullYear() === dateB.getFullYear() &&
  dateA.getMonth() === dateB.getMonth();

export default async function InvoiceManagementPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: invoiceRows } = await serverSupabase
    .from('invoices')
    .select(
      'id, invoice_number, total_amount, status, due_date, created_at, updated_at, job_id, client_id'
    )
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  // Resolve a display name per invoice. Prefer the linked client's name,
  // fall back to the job title so contractors don't see a blank column.
  const rows = (invoiceRows || []) as InvoiceRow[];
  const clientIds = Array.from(
    new Set(rows.map((r) => r.client_id).filter((v): v is string => !!v))
  );
  const jobIds = Array.from(
    new Set(rows.map((r) => r.job_id).filter((v): v is string => !!v))
  );

  const clientLookup: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await serverSupabase
      .from('contractor_clients')
      .select('id, first_name, last_name, company_name')
      .in('id', clientIds);
    for (const c of (clients ?? []) as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
    }[]) {
      const display =
        c.company_name?.trim() ||
        [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
      if (display) clientLookup[c.id] = display;
    }
  }

  const jobLookup: Record<string, string> = {};
  if (jobIds.length > 0) {
    const { data: jobsData } = await serverSupabase
      .from('jobs')
      .select('id, title')
      .in('id', jobIds);
    for (const j of (jobsData ?? []) as {
      id: string;
      title: string | null;
    }[]) {
      if (j.title) jobLookup[j.id] = j.title;
    }
  }

  const invoices = rows.map((invoice) => ({
    ...invoice,
    client_name:
      (invoice.client_id && clientLookup[invoice.client_id]) ||
      (invoice.job_id && jobLookup[invoice.job_id]) ||
      'Client',
    total_amount: Number(invoice.total_amount ?? 0),
  }));

  const totalOutstanding = invoices
    .filter(
      (invoice) => invoice.status === 'sent' || invoice.status === 'overdue'
    )
    .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

  const overdue = invoices.filter(
    (invoice) => invoice.status === 'overdue'
  ).length;

  const now = new Date();
  const paidThisMonth = invoices
    .filter((invoice) => {
      if (invoice.status !== 'paid') return false;
      const reference = new Date(invoice.updated_at ?? invoice.created_at);
      return isSameMonth(reference, now);
    })
    .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

  const stats = {
    totalOutstanding,
    overdue,
    paidThisMonth,
  };

  return <InvoiceManagementClient invoices={invoices} stats={stats} />;
}
