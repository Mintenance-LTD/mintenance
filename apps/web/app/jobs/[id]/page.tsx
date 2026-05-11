import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
import { redirect } from 'next/navigation';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { logger } from '@/lib/logger';
import { JobDetailsProfessional } from './components/JobDetailsProfessional';
import { JobViewTracker } from './components/JobViewTracker';
import { ContractManagement } from './components/ContractManagement';
import { HomeownerPhotoReview } from './components/HomeownerPhotoReview';
import { MintEditorialJobDetailView } from './components/mint-editorial/MintEditorialJobDetailView';

export const metadata: Metadata = {
  title: 'Job Details | Mintenance',
  description:
    'View job details, contractor bids, and project status for your maintenance request.',
};

export default async function JobDetailPage2025({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    .select(
      '*, scheduled_start_date, scheduled_end_date, scheduled_duration_hours'
    )
    .eq('id', resolvedParams.id)
    .single();

  logger.debug('JobDetailPage2025 - Fetching job', {
    jobId: resolvedParams.id,
    jobFound: !!job,
  });

  if (jobError || !job) {
    logger.error('JobDetailPage2025 - Job not found', {
      jobId: resolvedParams.id,
    });
    redirect('/jobs');
  }

  // Authorization: only the job owner or admins can view this page
  if (user.role !== 'admin' && job.homeowner_id !== user.id) {
    logger.warn('JobDetailPage2025 - Unauthorized access attempt', {
      jobId: resolvedParams.id,
      userId: user.id,
      homeownerId: job.homeowner_id,
    });
    redirect('/jobs');
  }

  // Fetch related data
  const { data: property } = job.property_id
    ? await serverSupabase
        .from('properties')
        .select('id, property_name, address')
        .eq('id', job.property_id)
        .single()
    : { data: null };

  const { data: contractor } = job.contractor_id
    ? await serverSupabase
        .from('profiles')
        .select(
          'id, first_name, last_name, email, phone, profile_image_url, admin_verified, company_name, license_number'
        )
        .eq('id', job.contractor_id)
        .single()
    : { data: null };

  // Fetch bids with contractor info and quote line items
  const { data: bids, error: bidsError } = await serverSupabase
    .from('bids')
    .select(
      `
      id,
      amount,
      description,
      status,
      created_at,
      contractor_id,
      quote_id,
      contractor:profiles!bids_contractor_id_fkey (
        id,
        first_name,
        last_name,
        email,
        phone,
        profile_image_url,
        admin_verified,
        company_name,
        license_number,
        rating,
        total_jobs_completed
      ),
      quote:contractor_quotes!quote_id (
        id,
        line_items
      )
    `
    )
    .eq('job_id', resolvedParams.id);

  if (bidsError) {
    logger.error('JobDetailPage2025 - Bids query error', {
      jobId: resolvedParams.id,
      error: bidsError.message,
    });
  }

  // Fetch portfolio images in batch
  const contractorIds = bids?.map((b) => b.contractor_id).filter(Boolean) || [];
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

    portfolioPosts?.forEach((post) => {
      if (!portfolioMap.has(post.contractor_id)) {
        portfolioMap.set(post.contractor_id, []);
      }
      const images = (post.media_urls || []).map((url: string) => ({
        url,
        title: post.title || 'Previous Work',
        category: post.project_category || 'General',
      }));
      portfolioMap.get(post.contractor_id).push(...images);
    });
  }

  // Fetch review counts per contractor in one round-trip so the bid
  // card can show "4.5 ★ (12 reviews)" instead of just the rating
  // number. Mirrors the mobile BidReviewCard which already renders
  // reviews_count; web was showing only avatar + name + amount.
  const reviewCountMap = new Map<string, number>();
  if (contractorIds.length > 0) {
    const { data: reviewRows } = await serverSupabase
      .from('reviews')
      .select('reviewee_id')
      .in('reviewee_id', contractorIds);
    for (const row of reviewRows ?? []) {
      const id = row.reviewee_id as string | null;
      if (id) reviewCountMap.set(id, (reviewCountMap.get(id) || 0) + 1);
    }
  }

  // Process bids (WFE-P1-3: drop bids whose contractor relationship is null
  // so downstream components never receive `contractor: null` and crash on
  // deep access like `bid.contractor.first_name`).
  const bidsWithContractors = (bids ?? [])
    .map((bid) => {
      const contractor = Array.isArray(bid.contractor)
        ? bid.contractor[0]
        : bid.contractor;

      if (!contractor) {
        logger.warn('JobDetailPage2025 - bid missing contractor relationship', {
          jobId: resolvedParams.id,
          bidId: bid.id,
        });
        return null;
      }

      const portfolioImages = bid.contractor_id
        ? (portfolioMap.get(bid.contractor_id) || []).slice(0, 12)
        : [];

      const quote = Array.isArray(bid.quote) ? bid.quote[0] : bid.quote;
      const lineItems = quote?.line_items ?? [];

      return {
        ...bid,
        contractor: {
          ...contractor,
          portfolioImages,
          reviews_count: reviewCountMap.get(contractor.id) || 0,
        },
        lineItems,
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  // Fetch job photos
  // NOTE: job_attachments uses 'uploaded_at' not 'created_at'
  const { data: photos } = await serverSupabase
    .from('job_attachments')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .order('uploaded_at', { ascending: false });

  // Re-sign any `Job-storage` URLs at render time. The bucket is now
  // `public=false` (2026-04-17 storage-hardening migration), so legacy
  // public URLs 404 and old signed URLs expire. Re-signing on read
  // keeps display working without touching stored rows or forcing a
  // backfill migration. External URLs pass through.
  const jobPhotoUrls = await resignJobStorageUrls(
    (photos ?? []).map((p) => p.file_url as string | null)
  );

  // Fetch before/after photo evidence
  const { data: photoEvidence } = await serverSupabase
    .from('job_photos_metadata')
    .select('id, photo_url, photo_type, created_at')
    .eq('job_id', resolvedParams.id)
    .in('photo_type', ['before', 'after'])
    .order('created_at', { ascending: true });

  const beforePhotos = (photoEvidence || []).filter(
    (p) => p.photo_type === 'before'
  );
  const afterPhotos = (photoEvidence || []).filter(
    (p) => p.photo_type === 'after'
  );

  // Fetch building assessment
  const { data: buildingAssessment } = await serverSupabase
    .from('building_assessments')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  interface BidWithContractor {
    id: string;
    status: string;
    amount?: number;
    description?: string;
    created_at: string;
    contractor_id: string;
    quote_id?: string;
    lineItems?: Array<{
      id: string;
      description: string;
      type?: 'labor' | 'material' | 'equipment';
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    contractor?: {
      id: string;
      first_name?: string;
      last_name?: string;
      company_name?: string;
      email?: string;
      phone?: string;
      profile_image_url?: string;
      admin_verified?: boolean;
      license_number?: string;
      rating?: number;
      portfolioImages?: Array<{
        url: string;
        title?: string;
        category?: string;
      }>;
    };
  }

  // Get accepted bid
  const acceptedBid = (bidsWithContractors as BidWithContractor[] | null)?.find(
    (bid: BidWithContractor) => bid.status === 'accepted'
  );

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

  // Fetch escrow transaction status for lifecycle tracking
  const { data: escrowTransaction } = await serverSupabase
    .from('escrow_transactions')
    .select('id, status')
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const escrowStatus = escrowTransaction?.status || 'none';

  const userDisplayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.email;

  const { data: userProfile } = await serverSupabase
    .from('profiles')
    .select('profile_image_url, email, first_name, last_name, phone')
    .eq('id', user.id)
    .single();

  // Format bids for Professional component
  const formattedBids = (bidsWithContractors as BidWithContractor[]).map(
    (bid: BidWithContractor) => ({
      id: bid.id,
      amount: bid.amount || 0,
      description: bid.description,
      status: bid.status,
      created_at: bid.created_at,
      quote_id: bid.quote_id,
      lineItems: bid.lineItems?.map((li) => ({
        ...li,
        type: li.type || ('labor' as const),
      })),
      contractor: {
        id: bid.contractor?.id || '',
        first_name: bid.contractor?.first_name,
        last_name: bid.contractor?.last_name,
        company_name: bid.contractor?.company_name,
        email: bid.contractor?.email || '',
        phone: bid.contractor?.phone,
        profile_image_url: bid.contractor?.profile_image_url,
        admin_verified: bid.contractor?.admin_verified,
        license_number: bid.contractor?.license_number,
      },
    })
  );

  // Prepare homeowner data
  const homeownerData = userProfile
    ? {
        id: user.id,
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        email: userProfile.email,
        phone: userProfile.phone,
        profile_image_url: userProfile.profile_image_url,
      }
    : undefined;

  // Phase-2 design rebrand: server-side cookie check picks the
  // Mint Editorial detail surface instead of JobDetailsProfessional
  // when the homeowner has opted in via Settings → Appearance.
  // No data refetch — both branches consume the same data.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return (
      <MintEditorialJobDetailView
        job={{
          id: job.id,
          title: job.title || 'Untitled Job',
          description: job.description || '',
          category: job.category || 'General',
          status: job.status,
          priority: job.priority,
          budget: job.budget || 0,
          location: job.location || 'Location not specified',
          created_at: job.created_at,
          contractor_id: job.contractor_id,
          completion_confirmed_by_homeowner:
            job.completion_confirmed_by_homeowner,
        }}
        property={property}
        contractor={contractor}
        bids={formattedBids as unknown as import('./components/BidCard').Bid[]}
        bidCount={bidsWithContractors.length}
        pendingBidCount={
          bidsWithContractors.filter((b) => b.status === 'pending').length
        }
        photos={jobPhotoUrls}
        beforePhotos={beforePhotos}
        afterPhotos={afterPhotos}
        contractStatus={contractStatus}
        escrowStatus={escrowStatus}
        userId={user.id}
      />
    );
  }

  return (
    <>
      <JobViewTracker jobId={resolvedParams.id} />

      <HomeownerPageWrapper>
        <JobDetailsProfessional
          job={{
            id: job.id,
            title: job.title || 'Untitled Job',
            description: job.description || '',
            category: job.category || 'General',
            status: job.status,
            priority: job.priority,
            budget: job.budget || 0,
            location: job.location || 'Location not specified',
            created_at: job.created_at,
            scheduled_start_date: job.scheduled_start_date,
            scheduled_end_date: job.scheduled_end_date,
            scheduled_duration_hours: job.scheduled_duration_hours,
            contractor_id: job.contractor_id,
            latitude: job.latitude,
            longitude: job.longitude,
          }}
          property={property}
          homeowner={homeownerData}
          contractor={contractor}
          bids={
            formattedBids as unknown as import('./components/JobDetailsProfessional').JobDetailsProfessionalProps['bids']
          }
          photos={jobPhotoUrls}
          currentUserId={user.id}
          userRole='homeowner'
          buildingAssessment={buildingAssessment}
          lifecycleData={{
            contractStatus,
            escrowStatus,
            bidCount: bidsWithContractors.length,
            pendingBidCount: bidsWithContractors.filter(
              (b) => b.status === 'pending'
            ).length,
            completionConfirmed: !!job.completion_confirmed_by_homeowner,
          }}
        />
        {/* The Photo Review and Contract panels need to align with the
            Bids Received card inside JobDetailsProfessional, not with
            the full page. JobDetailsProfessional renders a 12-col grid
            inside `max-w-7xl mx-auto px-6 py-8`, where the main content
            (including Bids Received) lives in `col-span-12 lg:col-span-8`.
            Mirror that same outer container + grid here so these two
            cards sit directly under the Bids Received column at the
            same width on wide viewports, and stack full-width on mobile
            just like everything else. */}
        <div className='max-w-7xl mx-auto px-6'>
          <div className='grid grid-cols-12 gap-8'>
            <div className='col-span-12 lg:col-span-8 space-y-6'>
              {job.status === 'completed' && afterPhotos.length > 0 && (
                <HomeownerPhotoReview
                  jobId={job.id}
                  beforePhotos={beforePhotos}
                  afterPhotos={afterPhotos}
                  isConfirmed={!!job.completion_confirmed_by_homeowner}
                />
              )}
              {job.contractor_id && (
                <div id='contract-section'>
                  <ContractManagement
                    jobId={job.id}
                    userRole='homeowner'
                    userId={user.id}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </HomeownerPageWrapper>
    </>
  );
}
