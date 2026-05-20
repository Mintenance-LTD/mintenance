import { cookies } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { CustomersTable } from './components/CustomersTable';
import { MessagesSidebar } from './components/MessagesSidebar';
import {
  MintEditorialCustomersView,
  type CustomerRecord,
  type CustomersKpis,
  type CustomerStage,
} from './components/MintEditorialCustomersView';

export const metadata = {
  title: 'Customers | Mintenance',
  description: 'Manage your customers and conversations',
};

interface CustomerData {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_image_url?: string;
}

interface JobRow {
  id: string;
  title: string | null;
  status: string;
  budget: number | null;
  postcode: string | null;
  city: string | null;
  created_at: string;
  completed_at: string | null;
  homeowner_id: string | null;
  homeowner?: CustomerData | CustomerData[];
}

interface BidRow {
  homeowner_id: string | null;
  homeowner?: CustomerData | CustomerData[];
}

interface MessageRow {
  sender_id: string;
  receiver_id: string;
  sender?: CustomerData | CustomerData[];
  receiver?: CustomerData | CustomerData[];
}

interface QuoteRow {
  status: string | null;
  total_amount: number | null;
  client_email: string | null;
}

interface ReviewRow {
  rating: number | null;
  reviewer_id: string | null;
}

function unwrap<T>(value: T | T[] | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function CustomersPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch all customers (homeowners the contractor has worked with) plus
  // the enriched data needed for LTV / stage / star aggregates.
  const [jobsData, bidsData, messagesData, quotesData, reviewsData] =
    await Promise.all([
      serverSupabase
        .from('jobs')
        .select(
          'id, title, status, budget, postcode, city, created_at, completed_at, homeowner_id, homeowner:homeowner_id (id, first_name, last_name, profile_image_url, email)'
        )
        .eq('contractor_id', user.id)
        .not('homeowner_id', 'is', null),
      serverSupabase
        .from('bids')
        .select(
          'homeowner_id, homeowner:homeowner_id (id, first_name, last_name, profile_image_url, email)'
        )
        .eq('contractor_id', user.id)
        .not('homeowner_id', 'is', null),
      serverSupabase
        .from('messages')
        .select(
          'sender_id, receiver_id, sender:sender_id (id, first_name, last_name, profile_image_url, email), receiver:receiver_id (id, first_name, last_name, profile_image_url, email)'
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
      serverSupabase
        .from('contractor_quotes')
        .select('status, total_amount, client_email')
        .eq('contractor_id', user.id),
      serverSupabase
        .from('reviews')
        .select('rating, reviewer_id')
        .eq('reviewee_id', user.id),
    ]);

  // Combine and deduplicate customers
  const customerMap = new Map<string, CustomerData>();

  ((jobsData.data || []) as JobRow[]).forEach((job) => {
    const homeowner = unwrap(job.homeowner);
    if (homeowner?.id) customerMap.set(homeowner.id, homeowner);
  });

  ((bidsData.data || []) as BidRow[]).forEach((bid) => {
    const homeowner = unwrap(bid.homeowner);
    if (homeowner?.id) customerMap.set(homeowner.id, homeowner);
  });

  ((messagesData.data || []) as MessageRow[]).forEach((message) => {
    const sender = unwrap(message.sender);
    const receiver = unwrap(message.receiver);
    const otherUser = message.sender_id === user.id ? receiver : sender;
    if (otherUser?.id && otherUser.id !== user.id) {
      customerMap.set(otherUser.id, otherUser);
    }
  });

  const customers = Array.from(customerMap.values()).map((c) => ({
    id: c.id,
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    email: c.email || '',
    profile_image_url: c.profile_image_url || null,
  }));

  // Fetch message threads for each customer (kept for the legacy sidebar)
  const customerIds = customers.map((c) => c.id);
  const { data: recentMessages } = await serverSupabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, created_at, read_at')
    .or(
      `sender_id.in.(${customerIds.join(',')}),receiver_id.in.(${customerIds.join(',')})`
    )
    .order('created_at', { ascending: false })
    .limit(100);

  // Unread counts per customer (legacy sidebar)
  const unreadCounts = new Map<string, number>();
  recentMessages?.forEach((message) => {
    if (message.receiver_id === user.id && !message.read_at) {
      const customerId = message.sender_id;
      unreadCounts.set(customerId, (unreadCounts.get(customerId) || 0) + 1);
    }
  });

  // Server-side theme detection — the contractor /layout.tsx already
  // mounts MintEditorialContractorShell when this cookie is set, so
  // child pages can branch the same way without a hydration round-trip.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    // ─── aggregate real data per customer for the Mint Editorial view ───
    const jobs = (jobsData.data || []) as JobRow[];
    const quotes = (quotesData.data || []) as QuoteRow[];
    const reviews = (reviewsData.data || []) as ReviewRow[];

    // jobs by homeowner
    const jobsByHomeowner = new Map<string, JobRow[]>();
    for (const job of jobs) {
      if (!job.homeowner_id) continue;
      const arr = jobsByHomeowner.get(job.homeowner_id) ?? [];
      arr.push(job);
      jobsByHomeowner.set(job.homeowner_id, arr);
    }

    // reviews by reviewer (the homeowner)
    const reviewsByReviewer = new Map<string, number[]>();
    for (const r of reviews) {
      if (!r.reviewer_id || r.rating == null) continue;
      const arr = reviewsByReviewer.get(r.reviewer_id) ?? [];
      arr.push(r.rating);
      reviewsByReviewer.set(r.reviewer_id, arr);
    }

    // quotes by client_email (best-effort match since contractor_quotes
    // doesn't currently track homeowner_id)
    const quotesByEmail = new Map<string, QuoteRow[]>();
    for (const q of quotes) {
      if (!q.client_email) continue;
      const arr = quotesByEmail.get(q.client_email.toLowerCase()) ?? [];
      arr.push(q);
      quotesByEmail.set(q.client_email.toLowerCase(), arr);
    }

    function deriveStage(
      customerJobs: JobRow[],
      hasOpenQuote: boolean
    ): CustomerStage {
      const hasActive = customerJobs.some(
        (j) => j.status === 'in_progress' || j.status === 'assigned'
      );
      if (hasActive) return 'active';
      if (hasOpenQuote) return 'quoting';
      const hasCompleted = customerJobs.some((j) => j.status === 'completed');
      if (hasCompleted) return 'done';
      return 'lead';
    }

    const customerRecords: CustomerRecord[] = customers.map((c) => {
      const cJobs = jobsByHomeowner.get(c.id) ?? [];
      const cQuotes = quotesByEmail.get(c.email.toLowerCase()) ?? [];
      const cReviews = reviewsByReviewer.get(c.id) ?? [];

      // LTV = sum of completed-job budgets
      const ltv = cJobs
        .filter((j) => j.status === 'completed')
        .reduce((sum, j) => sum + (Number(j.budget) || 0), 0);

      // Last job — most recent by completed_at or created_at
      const sortedJobs = [...cJobs].sort((a, b) => {
        const aT = new Date(a.completed_at || a.created_at).getTime();
        const bT = new Date(b.completed_at || b.created_at).getTime();
        return bT - aT;
      });
      const lastJob = sortedJobs[0] ?? null;

      const hasOpenQuote = cQuotes.some(
        (q) => q.status === 'sent' || q.status === 'pending'
      );
      const stage = deriveStage(cJobs, hasOpenQuote);

      const starAverage =
        cReviews.length > 0
          ? cReviews.reduce((sum, r) => sum + r, 0) / cReviews.length
          : null;

      const name =
        `${c.first_name} ${c.last_name}`.trim() || c.email || 'Customer';

      return {
        id: c.id,
        name,
        email: c.email,
        avatarUrl: c.profile_image_url,
        lastJobTitle: lastJob?.title ?? null,
        lastJobDate: lastJob?.completed_at ?? lastJob?.created_at ?? null,
        property:
          lastJob?.postcode ??
          (lastJob?.city ? lastJob.city : null) ??
          null,
        ltv,
        stage,
        starAverage,
      };
    });

    // KPIs — all real from the same data set
    const activeJobs = jobs.filter(
      (j) => j.status === 'in_progress' || j.status === 'assigned'
    );
    const pendingQuotes = quotes.filter(
      (q) => q.status === 'sent' || q.status === 'pending'
    );

    const kpis: CustomersKpis = {
      newLeads: customerRecords.filter((c) => c.stage === 'lead').length,
      quotesOut: pendingQuotes.length,
      activeJobs: activeJobs.length,
      pipelineValue:
        activeJobs.reduce((sum, j) => sum + (Number(j.budget) || 0), 0) +
        pendingQuotes.reduce(
          (sum, q) => sum + (Number(q.total_amount) || 0),
          0
        ),
    };

    // "Leads waiting on you" — customers in lead stage who have unread
    // inbound messages
    let leadsWaiting = 0;
    for (const c of customerRecords) {
      if (c.stage !== 'lead') continue;
      if ((unreadCounts.get(c.id) ?? 0) > 0) leadsWaiting++;
    }

    return (
      <MintEditorialCustomersView
        customers={customerRecords}
        kpis={kpis}
        totalCount={customerRecords.length}
        leadsWaiting={leadsWaiting}
      />
    );
  }

  // Legacy view (unchanged)
  return (
    <div className='w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Customers</h1>
        <p className='text-sm text-gray-600 mt-1'>
          {customers.length} total{' '}
          {customers.length === 1 ? 'customer' : 'customers'}
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <CustomersTable customers={customers} />
        </div>

        <div className='lg:col-span-1'>
          <MessagesSidebar
            customers={customers}
            messages={recentMessages || []}
            unreadCounts={unreadCounts}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  );
}
