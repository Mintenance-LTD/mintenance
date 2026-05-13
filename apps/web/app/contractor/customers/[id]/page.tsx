import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ArrowLeft,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  PoundSterling,
} from 'lucide-react';

export const metadata = {
  title: 'Customer Details | Mintenance',
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch customer profile
  const { data: customer } = await serverSupabase
    .from('profiles')
    .select(
      'id, first_name, last_name, email, phone, profile_image_url, city, country, created_at'
    )
    .eq('id', customerId)
    .single();

  if (!customer) {
    redirect('/contractor/customers');
  }

  // Fetch jobs with this customer — from direct assignment OR accepted bids
  const { data: directJobs } = await serverSupabase
    .from('jobs')
    .select(
      'id, title, description, status, category, budget, final_price, created_at, completed_at'
    )
    .eq('contractor_id', user.id)
    .eq('homeowner_id', customerId)
    .order('created_at', { ascending: false });

  // Also get jobs via bids (covers pre-assignment stage)
  const { data: bidJobs } = await serverSupabase
    .from('bids')
    .select(
      'job:jobs!inner(id, title, description, status, category, budget, final_price, created_at, completed_at)'
    )
    .eq('contractor_id', user.id)
    .eq('jobs.homeowner_id', customerId);

  // Deduplicate
  const jobMap = new Map<string, Record<string, unknown>>();
  for (const j of directJobs || [])
    jobMap.set(j.id, j as Record<string, unknown>);
  for (const b of bidJobs || []) {
    const j = (b as Record<string, unknown>).job as Record<
      string,
      unknown
    > | null;
    if (j?.id && !jobMap.has(j.id as string)) jobMap.set(j.id as string, j);
  }
  const jobs = [...jobMap.values()].sort(
    (a, b) =>
      new Date(b.created_at as string).getTime() -
      new Date(a.created_at as string).getTime()
  );

  // Fetch messages
  const { data: recentMessages } = await serverSupabase
    .from('messages')
    .select('id, content, created_at, sender_id')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${customerId}),and(sender_id.eq.${customerId},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch reviews from this customer
  const { data: reviews } = await serverSupabase
    .from('reviews')
    .select('id, rating, comment, created_at')
    .eq('reviewer_id', customerId)
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  const customerName =
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    'Unknown';
  const totalJobs = jobs?.length || 0;
  const completedJobs =
    jobs?.filter((j) => j.status === 'completed').length || 0;
  const totalRevenue = (jobs || []).reduce(
    (sum, j) => sum + ((j.final_price as number) || (j.budget as number) || 0),
    0
  );
  const avgRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(
        1
      )
    : null;

  const STATUS_COLORS: Record<string, string> = {
    posted: 'bg-blue-100 text-blue-700',
    assigned: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
    disputed: 'bg-red-100 text-red-700',
  };

  // 2026-05-13: server-side theme detection \u2014 same pattern as the rest
  // of the contractor server pages.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  return (
    <div className='max-w-5xl mx-auto px-6 py-8'>
      {/* Back */}
      <Link
        href='/contractor/customers'
        className={
          isMintEditorial
            ? 'btn btn-ghost btn-sm'
            : 'inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors'
        }
        style={
          isMintEditorial
            ? {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 20,
              }
            : undefined
        }
      >
        <ArrowLeft className='w-4 h-4' />
        Back to Customers
      </Link>

      {/* Customer header */}
      <div
        className={
          isMintEditorial
            ? 'card card-pad'
            : 'bg-white rounded-2xl border border-gray-200 p-8 mb-6'
        }
        style={isMintEditorial ? { marginBottom: 16 } : undefined}
      >
        <div className='flex items-start gap-6'>
          {customer.profile_image_url ? (
            <Image
              src={customer.profile_image_url}
              alt={customerName}
              width={80}
              height={80}
              className='w-20 h-20 rounded-full object-cover'
            />
          ) : (
            <div
              className={
                isMintEditorial
                  ? 'w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold'
                  : 'w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-2xl font-bold'
              }
              style={
                isMintEditorial
                  ? {
                      background: 'var(--me-brand-soft)',
                      color: 'var(--me-brand)',
                    }
                  : undefined
              }
            >
              {(customer.first_name?.[0] || '?').toUpperCase()}
            </div>
          )}
          <div className='flex-1'>
            <h1
              className={
                isMintEditorial ? 't-h2' : 'text-2xl font-bold text-gray-900'
              }
              style={isMintEditorial ? { margin: 0 } : undefined}
            >
              {customerName}
            </h1>
            {(customer.city || customer.country) && (
              <p
                className={
                  isMintEditorial
                    ? 't-meta'
                    : 'text-gray-500 flex items-center gap-1 mt-1'
                }
                style={
                  isMintEditorial
                    ? {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 4,
                      }
                    : undefined
                }
              >
                <MapPin className='w-4 h-4' />
                {[customer.city, customer.country].filter(Boolean).join(', ')}
              </p>
            )}
            <div className='flex flex-wrap gap-4 mt-4'>
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className={
                    isMintEditorial
                      ? 'inline-flex items-center gap-1.5 text-sm'
                      : 'inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-600'
                  }
                  style={
                    isMintEditorial ? { color: 'var(--me-ink-2)' } : undefined
                  }
                >
                  <Mail className='w-4 h-4' /> {customer.email}
                </a>
              )}
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className={
                    isMintEditorial
                      ? 'inline-flex items-center gap-1.5 text-sm'
                      : 'inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-600'
                  }
                  style={
                    isMintEditorial ? { color: 'var(--me-ink-2)' } : undefined
                  }
                >
                  <Phone className='w-4 h-4' /> {customer.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {isMintEditorial ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid var(--me-line)',
            }}
          >
            <div className='kpi' style={{ padding: 0, border: 'none' }}>
              <div className='label'>Total jobs</div>
              <div className='num'>{totalJobs}</div>
            </div>
            <div className='kpi' style={{ padding: 0, border: 'none' }}>
              <div className='label'>Completed</div>
              <div className='num'>{completedJobs}</div>
            </div>
            <div className='kpi' style={{ padding: 0, border: 'none' }}>
              <div className='label'>Total revenue</div>
              <div className='num' style={{ color: 'var(--me-brand)' }}>
                \u00A3{totalRevenue.toLocaleString('en-GB')}
              </div>
            </div>
            <div className='kpi' style={{ padding: 0, border: 'none' }}>
              <div className='label'>
                {avgRating ? 'Avg rating' : 'Reviews'}
              </div>
              <div className='num'>{avgRating || '\u2014'}</div>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100'>
            <div>
              <div className='text-2xl font-bold text-gray-900'>
                {totalJobs}
              </div>
              <div className='text-sm text-gray-500'>Total Jobs</div>
            </div>
            <div>
              <div className='text-2xl font-bold text-gray-900'>
                {completedJobs}
              </div>
              <div className='text-sm text-gray-500'>Completed</div>
            </div>
            <div>
              <div className='text-2xl font-bold text-teal-600'>
                {'\u00A3'}
                {totalRevenue.toLocaleString('en-GB')}
              </div>
              <div className='text-sm text-gray-500'>Total Revenue</div>
            </div>
            <div>
              <div className='text-2xl font-bold text-gray-900'>
                {avgRating || '\u2014'}
              </div>
              <div className='text-sm text-gray-500'>
                {avgRating ? 'Avg Rating' : 'No Reviews Yet'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className='grid lg:grid-cols-3 gap-6'>
        {/* Job history */}
        <div className='lg:col-span-2'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
            <Briefcase className='w-5 h-5 text-gray-400' />
            Job History ({totalJobs})
          </h2>
          {totalJobs === 0 ? (
            <div className='bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500'>
              No jobs with this customer yet.
            </div>
          ) : (
            <div className='space-y-3'>
              {jobs.map((job) => {
                const id = job.id as string;
                const title = (job.title as string) || 'Untitled';
                const cat = (job.category as string) || 'general';
                const status = (job.status as string) || 'posted';
                const date = job.created_at as string;
                const price =
                  (job.final_price as number) || (job.budget as number) || 0;
                return (
                  <Link
                    key={id}
                    href={`/contractor/jobs/${id}`}
                    className='block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow'
                  >
                    <div className='flex items-start justify-between'>
                      <div>
                        <h3 className='font-medium text-gray-900'>{title}</h3>
                        <p className='text-sm text-gray-500 mt-1'>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          {' \u00b7 '}
                          {new Date(date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className='text-lg font-semibold text-gray-900'>
                          {'\u00A3'}
                          {price.toLocaleString('en-GB')}
                        </span>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {status
                            .replace('_', ' ')
                            .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: recent messages + reviews */}
        <div className='space-y-6'>
          {/* Recent messages */}
          <div>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              Recent Messages
            </h2>
            <div className='bg-white rounded-xl border border-gray-200 divide-y divide-gray-100'>
              {!recentMessages || recentMessages.length === 0 ? (
                <div className='p-4 text-sm text-gray-500 text-center'>
                  No messages yet
                </div>
              ) : (
                recentMessages.map((msg) => (
                  <div key={msg.id} className='p-4'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-xs font-medium text-gray-500'>
                        {msg.sender_id === user.id ? 'You' : customerName}
                      </span>
                      <span className='text-xs text-gray-400'>
                        {new Date(msg.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className='text-sm text-gray-700 line-clamp-2'>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reviews */}
          {reviews && reviews.length > 0 && (
            <div>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                Reviews from {customer.first_name}
              </h2>
              <div className='space-y-3'>
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className='bg-white rounded-xl border border-gray-200 p-4'
                  >
                    <div className='flex items-center gap-1 mb-2'>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-sm ${i < review.rating ? 'text-amber-400' : 'text-gray-200'}`}
                        >
                          {'\u2605'}
                        </span>
                      ))}
                    </div>
                    {review.comment && (
                      <p className='text-sm text-gray-600'>{review.comment}</p>
                    )}
                    <p className='text-xs text-gray-400 mt-2'>
                      {new Date(review.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
