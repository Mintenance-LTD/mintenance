/**
 * Complete Integration Example
 * Shows how to integrate JobDetailsProfessional into your page.tsx
 *
 * To use this:
 * 1. Copy this code into your apps/web/app/jobs/[id]/page.tsx
 * 2. Or use as reference for your own implementation
 */

import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { JobDetailsProfessional } from './JobDetailsProfessional';

export default async function JobDetailPageProfessional({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  // Authentication check
  if (!user) {
    redirect('/login?redirect=/jobs');
  }

  // Redirect contractors to their bid page
  if (user.role === 'contractor') {
    redirect(`/contractor/bid/${resolvedParams.id}`);
  }

  // ===========================================
  // FETCH JOB DATA
  // ===========================================
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (jobError || !job) {
    redirect('/jobs');
  }

  // ===========================================
  // FETCH PROPERTY
  // ===========================================
  const { data: property } = job.property_id
    ? await serverSupabase
        .from('properties')
        .select('id, property_name, address')
        .eq('id', job.property_id)
        .single()
    : { data: null };

  // ===========================================
  // FETCH HOMEOWNER
  // ===========================================
  const { data: homeowner } = await serverSupabase
    .from('users')
    .select('id, first_name, last_name, email, phone, profile_image_url')
    .eq('id', job.user_id)
    .single();

  // ===========================================
  // FETCH ASSIGNED CONTRACTOR
  // ===========================================
  const { data: contractor } = job.contractor_id
    ? await serverSupabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          profile_image_url,
          admin_verified,
          license_number
        `)
        .eq('id', job.contractor_id)
        .single()
    : { data: null };

  // ===========================================
  // FETCH BIDS WITH CONTRACTOR INFO
  // ===========================================
  const { data: bids } = await serverSupabase
    .from('bids')
    .select(`
      id,
      amount,
      description,
      status,
      created_at,
      contractor_id,
      contractor:users!bids_contractor_id_fkey (
        id,
        first_name,
        last_name,
        company_name,
        email,
        phone,
        profile_image_url,
        admin_verified,
        license_number
      )
    `)
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false });

  // ===========================================
  // FETCH JOB PHOTOS
  // ===========================================
  const { data: photoAttachments } = await serverSupabase
    .from('job_attachments')
    .select('file_url')
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false });

  const photos = photoAttachments?.map((p) => p.file_url) || [];

  // ===========================================
  // PROCESS BIDS DATA
  // ===========================================
  const processedBids = bids
    ? bids.map((bid) => ({
        id: bid.id,
        amount: bid.amount,
        description: bid.description,
        status: bid.status,
        created_at: bid.created_at,
        contractor: Array.isArray(bid.contractor)
          ? bid.contractor[0]
          : bid.contractor,
      }))
    : [];

  // ===========================================
  // RENDER COMPONENT
  // ===========================================
  return (
    <JobDetailsProfessional
      job={{
        id: job.id,
        title: job.title || 'Untitled Job',
        description: job.description || '',
        category: job.category || 'general',
        status: job.status,
        priority: job.priority || 'medium',
        budget: job.budget || 0,
        location: job.location || 'Location not specified',
        created_at: job.created_at,
        scheduled_start_date: job.scheduled_start_date,
        scheduled_end_date: job.scheduled_end_date,
        scheduled_duration_hours: job.scheduled_duration_hours,
        contractor_id: job.contractor_id,
      }}
      property={property}
      homeowner={homeowner}
      contractor={contractor}
      bids={processedBids}
      photos={photos}
      currentUserId={user.id}
      userRole={user.role as 'homeowner' | 'contractor'}
    />
  );
}

/**
 * ALTERNATIVE: Wrapped in Layout
 *
 * If you want to wrap it in your existing layout:
 */

/*
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export default async function JobDetailPageProfessional({ params }) {
  // ... same fetch logic as above ...

  return (
    <HomeownerPageWrapper>
      <JobDetailsProfessional
        job={job}
        property={property}
        homeowner={homeowner}
        contractor={contractor}
        bids={processedBids}
        photos={photos}
        currentUserId={user.id}
        userRole={user.role}
      />
    </HomeownerPageWrapper>
  );
}
*/

/**
 * ALTERNATIVE: With Loading State
 *
 * For better UX with React Suspense:
 */

/*
import { Suspense } from 'react';
import { JobDetailsSkeleton } from './components/JobDetailsSkeleton';

export default function JobDetailPageProfessional({ params }) {
  return (
    <Suspense fallback={<JobDetailsSkeleton />}>
      <JobDetailsContent params={params} />
    </Suspense>
  );
}

async function JobDetailsContent({ params }) {
  // ... fetch logic and return JobDetailsProfessional ...
}
*/

/**
 * ALTERNATIVE: Error Boundary
 *
 * For better error handling:
 */

/*
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function JobDetailPageProfessional({ params }) {
  return (
    <ErrorBoundary fallback={<JobErrorPage />}>
      <JobDetailsContent params={params} />
    </ErrorBoundary>
  );
}
*/
