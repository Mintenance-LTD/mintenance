import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { logger } from '@/lib/logger';
import { JobDetailsProfessional } from './components/JobDetailsProfessional';
import { JobViewTracker } from './components/JobViewTracker';

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
    contractor?: {
      id: string;
      first_name?: string;
      last_name?: string;
      company_name?: string;
      profile_image_url?: string;
      rating?: number;
      portfolioImages?: Array<{ url: string; title?: string; category?: string }>;
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
    .select('profile_image_url, email, first_name, last_name, phone')
    .eq('id', user.id)
    .single();

  // Format bids for Professional component
  const formattedBids = (bidsWithContractors as BidWithContractor[]).map((bid: BidWithContractor) => ({
    id: bid.id,
    amount: bid.amount || 0,
    description: bid.description,
    status: bid.status,
    created_at: bid.created_at,
    contractor: {
      id: bid.contractor?.id || '',
      first_name: bid.contractor?.first_name,
      last_name: bid.contractor?.last_name,
      company_name: bid.contractor?.company_name,
      email: (bid.contractor as any)?.email || '',
      phone: (bid.contractor as any)?.phone,
      profile_image_url: bid.contractor?.profile_image_url,
      admin_verified: (bid.contractor as any)?.admin_verified,
      license_number: (bid.contractor as any)?.license_number,
    },
  }));

  // Prepare homeowner data
  const homeownerData = userProfile ? {
    id: user.id,
    first_name: userProfile.first_name,
    last_name: userProfile.last_name,
    email: userProfile.email,
    phone: userProfile.phone,
    profile_image_url: userProfile.profile_image_url,
  } : undefined;

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
          }}
          property={property}
          homeowner={homeownerData}
          contractor={contractor}
          bids={formattedBids}
          photos={photos?.map(p => p.file_url) || []}
          currentUserId={user.id}
          userRole="homeowner"
          buildingAssessment={buildingAssessment}
        />
      </HomeownerPageWrapper>
    </>
  );
}
