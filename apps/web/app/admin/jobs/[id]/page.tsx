import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { Card } from '@/components/ui/Card';

export const metadata = { title: 'Job Review | Admin | Mintenance' };

export default async function AdminJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Check here as well as in the layout: service-role reads must never rely on layout execution order.
  const user = await getCurrentUserFromCookies();
  if (!user || user.role !== 'admin') redirect('/admin/login');
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { data: job, error } = await serverSupabase.from('jobs')
    .select('id,title,description,status,category,budget,created_at,homeowner_id,contractor_id')
    .eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throw new Error('Unable to load the job for review. Please try again.');
  if (!job) notFound();
  const { data: bids, error: bidsError } = await serverSupabase.from('bids')
    .select('id,contractor_id,amount,description,status,created_at')
    .eq('job_id', id).order('created_at', { ascending: false });
  if (bidsError) throw new Error('Unable to load bids for review. Please try again.');
  const money = (value: number | null) => value == null ? 'Not specified' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <Link href="/admin/jobs" className="font-medium underline">Back to job management</Link>
      <header className="space-y-2">
        <p className="text-sm font-medium">Admin review · Read only</p>
        <h1 className="text-3xl font-semibold">{job.title}</h1>
        <p>Review job details and bids. Bid decisions, contracts and payments remain with the job participants.</p>
      </header>
      <nav aria-label="Job review sections" className="flex gap-6">
        <a href="#overview" className="underline">Overview</a>
        <a href="#bids" className="underline">Bids ({bids?.length ?? 0})</a>
      </nav>
      <Card id="overview" padding="lg">
        <h2 className="mb-4 text-xl font-semibold">Job overview</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt>Status</dt><dd className="font-medium">{job.status.replaceAll('_', ' ')}</dd></div>
          <div><dt>Category</dt><dd>{job.category || 'Not specified'}</dd></div>
          <div><dt>Budget</dt><dd>{money(job.budget)}</dd></div>
          <div><dt>Created</dt><dd>{new Date(job.created_at).toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}</dd></div>
        </dl>
        <p className="mt-6 whitespace-pre-wrap">{job.description || 'No description provided.'}</p>
        <div className="mt-6 flex flex-wrap gap-6">
          {job.homeowner_id && <Link className="underline" href={`/admin/users/${job.homeowner_id}`}>Review homeowner profile</Link>}
          {job.contractor_id && <Link className="underline" href={`/admin/users/${job.contractor_id}`}>Review assigned contractor</Link>}
        </div>
      </Card>
      <section id="bids" aria-labelledby="bids-heading" className="scroll-mt-6 space-y-4">
        <h2 id="bids-heading" className="text-xl font-semibold">Bids ({bids?.length ?? 0})</h2>
        {!bids?.length && <Card padding="lg"><p>No bids have been submitted for this job.</p></Card>}
        {bids?.map(bid => (
          <Card key={bid.id} padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">{money(bid.amount)}</h3>
              <span>{bid.status.replaceAll('_', ' ')}</span>
            </div>
            <p className="my-4 whitespace-pre-wrap">{bid.description || 'No proposal description provided.'}</p>
            <Link className="underline" href={`/admin/users/${bid.contractor_id}`}>Review bidder profile</Link>
          </Card>
        ))}
      </section>
    </div>
  );
}
