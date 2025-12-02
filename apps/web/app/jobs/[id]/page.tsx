import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { logger } from '@/lib/logger';
import { JobDetailsHero2025 } from './components/JobDetailsHero2025';
import { BidComparisonTable2025 } from './components/BidComparisonTable2025';
import { JobViewTracker } from './components/JobViewTracker';
import { IntelligentMatching } from './components/IntelligentMatching';
import { ContractManagement } from './components/ContractManagement';
import { JobScheduling } from './components/JobScheduling';
import { JobActions } from '@/components/jobs/JobActions';
import { JobTimeline } from '@/components/jobs/JobTimeline';
import { BudgetDisplay } from '@/components/jobs/BudgetDisplay';

export default async function JobDetailPage2025({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/jobs');
  }

  if (user.role === 'contractor') {
    redirect(`/contractor/bid/${resolvedParams.id}`);
  }

  // Fetch job details
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('*, scheduled_start_date, scheduled_end_date, scheduled_duration_hours')
    .eq('id', resolvedParams.id)
    .single();

  logger.debug('JobDetailPage2025 - Fetching job', {
    jobId: resolvedParams.id,
    jobFound: !!job,
  });

  if (jobError || !job) {
    logger.error('JobDetailPage2025 - Job not found', { jobId: resolvedParams.id });
    redirect('/jobs');
  }

  // Fetch related data
  const { data: property } = job.property_id ? await serverSupabase
    .from('properties')
    .select('id, property_name, address')
    .eq('id', job.property_id)
    .single() : { data: null };

  const { data: contractor } = job.contractor_id ? await serverSupabase
    .from('users')
    .select('id, first_name, last_name, email, phone, profile_image_url, admin_verified, company_name, license_number')
    .eq('id', job.contractor_id)
    .single() : { data: null };

  // Fetch bids with contractor info
  const { data: bids } = await serverSupabase
    .from('bids')
    .select(`
      id,
      amount,
      description,
      status,
      created_at,
      contractor_id,
      quote_id,
      contractor:users!bids_contractor_id_fkey (
        id,
        first_name,
        last_name,
        email,
        phone,
        profile_image_url,
        admin_verified,
        company_name,
        license_number
      )
    `)
    .eq('job_id', resolvedParams.id);

  // Fetch portfolio images in batch
  const contractorIds = bids?.map(b => b.contractor_id).filter(Boolean) || [];
  const portfolioMap = new Map();
  if (contractorIds.length > 0) {
    const { data: portfolioPosts } = await serverSupabase
      .from('contractor_posts')
      .select('contractor_id, media_urls, title, project_category')
      .in('contractor_id', contractorIds)
      .in('post_type', ['portfolio', 'work_showcase'])
      .eq('is_active', true)
      .not('media_urls', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    portfolioPosts?.forEach(post => {
      if (!portfolioMap.has(post.contractor_id)) {
        portfolioMap.set(post.contractor_id, []);
      }
      const images = (post.media_urls || []).map((url: string) => ({
        url,
        title: post.title || 'Previous Work',
        category: post.project_category || 'General'
      }));
      portfolioMap.get(post.contractor_id).push(...images);
    });
  }

  // Process bids
  const bidsWithContractors = bids ? bids.map((bid) => {
    const contractor = Array.isArray(bid.contractor) ? bid.contractor[0] : bid.contractor;
    const portfolioImages = bid.contractor_id ? (portfolioMap.get(bid.contractor_id) || []).slice(0, 12) : [];

    return {
      ...bid,
      contractor: contractor ? { ...contractor, portfolioImages } : null,
    };
  }) : [];

  // Fetch job photos
  const { data: photos } = await serverSupabase
    .from('job_attachments')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false });

  interface BidWithContractor {
    id: string;
    status: string;
    amount?: number;
    description?: string;
    created_at: string;
    contractor_id: string;
    contractor?: {
      id: string;
      first_name?: string;
      last_name?: string;
      company_name?: string;
      profile_image_url?: string;
      rating?: number;
      portfolioImages?: string[];
    };
  }

  // Get accepted bid
  const acceptedBid = (bidsWithContractors as BidWithContractor[] | null)?.find((bid: BidWithContractor) => bid.status === 'accepted');

  // Fetch contract
  const { data: contract } = await serverSupabase
    .from('contracts')
    .select('id, status, contractor_signed_at, homeowner_signed_at')
    .eq('job_id', resolvedParams.id)
    .single();

  const contractStatus = !contract
    ? 'none'
    : contract.status === 'accepted'
      ? 'accepted'
      : 'pending';

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const { data: userProfile } = await serverSupabase
    .from('users')
    .select('profile_image_url, email')
    .eq('id', user.id)
    .single();

  return (
    <>
      <JobViewTracker jobId={resolvedParams.id} />

      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
        <UnifiedSidebar
          userRole="homeowner"
          userInfo={{
            name: userDisplayName,
            email: userProfile?.email || user.email,
            avatar: userProfile?.profile_image_url,
          }}
        />

        <main className="flex flex-col flex-1 ml-[240px]">
          {/* Job Details Hero */}
          <JobDetailsHero2025
            title={job.title || 'Untitled Job'}
            description={job.description || ''}
            category={job.category || 'General'}
            urgency={job.priority || 'medium'}
            budget={job.budget || 0}
            status={job.status}
            location={job.location || 'Location not specified'}
            createdAt={job.created_at}
            images={photos?.map(p => p.file_url) || []}
            homeowner={{
              name: userDisplayName,
              avatar: userProfile?.profile_image_url,
              rating: undefined,
              jobsPosted: undefined,
            }}
          />

          {/* Main Content */}
          <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Bids & AI Matching */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                {/* AI Intelligent Matching */}
                <IntelligentMatching
                  jobId={resolvedParams.id}
                />

                {/* Bids Comparison Table */}
                <BidComparisonTable2025
                  bids={(bidsWithContractors as BidWithContractor[]).map((bid: BidWithContractor) => ({
                    id: bid.id,
                    bid_amount: bid.amount || 0,
                    description: bid.description,
                    status: bid.status,
                    created_at: bid.created_at,
                    contractor: {
                      id: bid.contractor?.id || '',
                      first_name: bid.contractor?.first_name || '',
                      last_name: bid.contractor?.last_name || '',
                      company_name: bid.contractor?.company_name,
                      profile_image_url: bid.contractor?.profile_image_url,
                      rating: 4.5, // TODO: Add ratings to DB
                      completed_jobs: 42, // TODO: Add to DB
                    },
                  }))}
                  jobId={resolvedParams.id}
                  onAcceptBid={async (bidId: string) => {
                    // TODO: Implement bid acceptance
                  }}
                  onRejectBid={async (bidId: string) => {
                    // TODO: Implement bid rejection
                  }}
                  processingBid={null}
                />
              </div>

              {/* Right Column: Contract, Scheduling & Actions */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {/* Property & Budget Info */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Job Details</h3>

                  <div className="space-y-4">
                    <BudgetDisplay
                      amount={job.budget || 0}
                      currency="GBP"
                      label="Budget"
                      size="md"
                      showIcon
                    />

                    {property && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="text-sm font-semibold text-gray-600 mb-2">Property</div>
                        <div className="font-bold text-gray-900">{property.property_name}</div>
                        <div className="text-sm text-gray-600 mt-1">{property.address}</div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm font-semibold text-gray-600 mb-2">Posted</div>
                      <div className="text-gray-900">{new Date(job.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>

                    {bidsWithContractors.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="text-sm font-semibold text-gray-600 mb-2">Bids Received</div>
                        <div className="text-2xl font-bold text-teal-600">{bidsWithContractors.length}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contract Management */}
                {acceptedBid && (
                  <ContractManagement
                    jobId={resolvedParams.id}
                    userRole="homeowner"
                    userId={user.id}
                  />
                )}

                {/* Job Scheduling */}
                {contractStatus === 'accepted' && (
                  <JobScheduling
                    jobId={resolvedParams.id}
                    userRole="homeowner"
                    userId={user.id}
                    currentSchedule={{
                      scheduled_start_date: job.scheduled_start_date,
                      scheduled_end_date: job.scheduled_end_date,
                      scheduled_duration_hours: job.scheduled_duration_hours,
                    }}
                  />
                )}

                {/* Job Actions */}
                <JobActions
                  jobId={resolvedParams.id}
                  status={job.status}
                  contractorId={job.contractor_id}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
