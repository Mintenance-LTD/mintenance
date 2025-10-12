import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { InvoiceManagementClient } from './components/InvoiceManagementClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type InvoiceRow = {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number | string | null;
  status: 'draft' | 'sent' | 'overdue' | 'paid';
  due_date: string;
  created_at: string;
  updated_at?: string | null;
};

const isSameMonth = (dateA: Date, dateB: Date) =>
  dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();

export default async function InvoiceManagementPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: invoiceRows = [] } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, client_name, total_amount, status, due_date, created_at, updated_at')
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  const invoices = (invoiceRows as InvoiceRow[]).map((invoice) => ({
    ...invoice,
    total_amount: Number(invoice.total_amount ?? 0),
  }));

  const totalOutstanding = invoices
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

  const overdue = invoices.filter((invoice) => invoice.status === 'overdue').length;

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
