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
import { formatBidsForClient, type BidWithContractor } from './lib/formatBids';

export const metadata: Metadata = {
  title: 'Job Details | Mintenance',
  description:
    'View job details, contractor bids, and project status for your maintenance request.',
};

interface PortfolioPostRow {
  contractor_id: string;
  media_urls: string[] | null;
  title: string | null;
  project_category: string | null;
}

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

  // 2026-07-06 audit #6: fetch everything that depends only on the job/user id
  // in ONE parallel batch instead of a sequential waterfall. property +
  // contractor are conditional on the job carrying those ids; the rest key off
  // the job or the current user. Supabase query builders never reject (they
  // resolve to `{ data, error }`, even the `.single()` calls that return an
  // error on zero rows), so Promise.all is safe here. Bids embeds contractor +
  // quote; access columns on `property` (migration 20260520000003) feed the
  // "Access shared with contractor" card and degrade gracefully via maybeSingle.
  const [
    { data: property },
    { data: contractor },
    { data: bids, error: bidsError },
    { data: photos },
    { data: photoEvidence },
    { data: buildingAssessment },
    { data: contract },
    { data: escrowTransaction },
    { data: userProfile },
  ] = await Promise.all([
    job.property_id
      ? serverSupabase
          .from('properties')
          .select(
            'id, property_name, address, access_mode, key_safe_code, access_notes, stopcock_location, gas_isolator_location, consumer_unit_location'
          )
          .eq('id', job.property_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    job.contractor_id
      ? serverSupabase
          .from('profiles')
          .select(
            'id, first_name, last_name, email, phone, profile_image_url, admin_verified, company_name, license_number'
          )
          .eq('id', job.contractor_id)
          .single()
      : Promise.resolve({ data: null }),
    serverSupabase
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
      estimated_duration_days,
      proposed_start_date,
      warranty_months,
      materials_included,
      contractor:profiles!bids_contractor_id_fkey (
        id,
        first_name,
        last_name,
        profile_image_url,
        admin_verified,
        company_name,
        license_number,
        rating,
        total_jobs_completed
      ),
      quote:contractor_quotes!quote_id (
        id,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        line_items,
        terms,
        quote_number
      )
    `
      )
      .eq('job_id', resolvedParams.id),
    serverSupabase
      .from('job_attachments')
      .select('*')
      .eq('job_id', resolvedParams.id)
      .order('uploaded_at', { ascending: false }),
    serverSupabase
      .from('job_photos_metadata')
      .select('id, photo_url, photo_type, created_at')
      .eq('job_id', resolvedParams.id)
      .in('photo_type', ['before', 'after'])
      .order('created_at', { ascending: true }),
    serverSupabase
      .from('building_assessments')
      .select('*')
      .eq('job_id', resolvedParams.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    serverSupabase
      .from('contracts')
      .select('id, status, contractor_signed_at, homeowner_signed_at')
      .eq('job_id', resolvedParams.id)
      .single(),
    serverSupabase
      .from('escrow_transactions')
      .select('id, status')
      .eq('job_id', resolvedParams.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serverSupabase
      .from('profiles')
      .select('profile_image_url, email, first_name, last_name, phone')
      .eq('id', user.id)
      .single(),
  ]);

  if (bidsError) {
    logger.error('JobDetailPage2025 - Bids query error', {
      jobId: resolvedParams.id,
      error: bidsError.message,
    });
  }

  // Second parallel batch: everything that needs a phase-1 result. Portfolio
  // images + review counts key off the bids' contractor ids; storage
  // re-signing keys off the fetched photos (the `Job-storage` bucket is
  // private since the 2026-04-17 hardening migration, so legacy/expired URLs
  // must be re-signed at render time — external URLs pass through).
  const contractorIds = bids?.map((b) => b.contractor_id).filter(Boolean) || [];
  const [portfolioResult, reviewResult, jobPhotoUrls] = await Promise.all([
    contractorIds.length > 0
      ? serverSupabase
          .from('contractor_posts')
          .select('contractor_id, media_urls, title, project_category')
          .in('contractor_id', contractorIds)
          .in('post_type', ['portfolio', 'work_showcase'])
          .eq('is_active', true)
          .not('media_urls', 'is', null)
          .order('created_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as PortfolioPostRow[] }),
    contractorIds.length > 0
      ? serverSupabase
          .from('reviews')
          .select('reviewee_id')
          .in('reviewee_id', contractorIds)
      : Promise.resolve({ data: [] as Array<{ reviewee_id: string | null }> }),
    resignJobStorageUrls(
      (photos ?? []).map((p) => p.file_url as string | null)
    ),
  ]);

  // Build the portfolio image map from the fetched posts.
  const portfolioMap = new Map();
  const portfolioPosts = (portfolioResult.data ?? []) as PortfolioPostRow[];
  portfolioPosts.forEach((post) => {
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

  // Review counts per contractor so the bid card can show "(12 reviews)".
  const reviewCountMap = new Map<string, number>();
  const reviewRows = (reviewResult.data ?? []) as Array<{
    reviewee_id: string | null;
  }>;
  for (const row of reviewRows) {
    const id = row.reviewee_id;
    if (id) reviewCountMap.set(id, (reviewCountMap.get(id) || 0) + 1);
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
        quote: quote ?? null,
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const beforePhotos = (photoEvidence || []).filter(
    (p) => p.photo_type === 'before'
  );
  const afterPhotos = (photoEvidence || []).filter(
    (p) => p.photo_type === 'after'
  );

  const contractStatus = !contract
    ? 'none'
    : contract.status === 'accepted'
      ? 'accepted'
      : 'pending';

  const escrowStatus = escrowTransaction?.status || 'none';

  // Format bids for the client components (email/phone deliberately omitted —
  // see the PII note in ./lib/formatBids).
  const formattedBids = formatBidsForClient(
    bidsWithContractors as BidWithContractor[]
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

  // Pull the homeowner's preferred start date out of `requirements`
  // (stashed there by job creation — the schema doesn't have a
  // dedicated column yet). The shape is `requirements.preferred_start_date`
  // set to an ISO date string.
  const requirements =
    job.requirements && typeof job.requirements === 'object'
      ? (job.requirements as Record<string, unknown>)
      : null;
  const preferredStartDate =
    requirements && typeof requirements.preferred_start_date === 'string'
      ? requirements.preferred_start_date
      : null;

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
          completed_at: job.completed_at,
          preferred_start_date: preferredStartDate,
          // audit-76 P1 follow-up: AccessSharedCard derives the
          // key-safe reveal window from this column via
          // canRevealKeySafeCode(). Without it the helper sees
          // `scheduled_start_date === undefined` and always returns
          // false on `status='assigned'`, so the homeowner card would
          // under-promise (mask the code) even when the contractor
          // page actually reveals it.
          scheduled_start_date: job.scheduled_start_date,
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
        contractContractorSignedAt={contract?.contractor_signed_at ?? null}
        contractHomeownerSignedAt={contract?.homeowner_signed_at ?? null}
        escrowStatus={escrowStatus}
        buildingAssessment={buildingAssessment}
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
                <div id='photo-review'>
                  <HomeownerPhotoReview
                    jobId={job.id}
                    beforePhotos={beforePhotos}
                    afterPhotos={afterPhotos}
                    isConfirmed={!!job.completion_confirmed_by_homeowner}
                    completedAt={job.completed_at}
                  />
                </div>
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
