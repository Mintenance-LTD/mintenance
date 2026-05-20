import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
import { redirect } from 'next/navigation';
import { JobDetailsClient } from '../components/JobDetailsClient';
import { logger } from '@mintenance/shared';

export const metadata: Metadata = {
  title: 'View Job | Mintenance',
  description:
    'View detailed job information, homeowner details, and submit your bid on Mintenance.',
};

export default async function ContractorJobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch job details
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select(
      `
      *,
      homeowner:homeowner_id (
        id,
        first_name,
        last_name,
        email,
        phone,
        profile_image_url,
        created_at
      )
    `
    )
    .eq('id', resolvedParams.id)
    .single();

  if (error || !job) {
    logger.error('Error fetching job:', error, { service: 'app' });
    // 2026-05-13: editorial-aware error state. Server-side cookie
    // detect — matches the pattern on /contractor/profile, /[id], etc.
    const cookieStore = await cookies();
    const isMintEditorial =
      cookieStore.get('mintenance-theme')?.value === 'mint-editorial';
    if (isMintEditorial) {
      return (
        <div
          className='col'
          style={{
            gap: 8,
            padding: 48,
            textAlign: 'center',
            maxWidth: 480,
            margin: '0 auto',
          }}
        >
          <h1 className='t-h2'>Job not found</h1>
          <p className='t-body'>
            The job you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
        </div>
      );
    }
    return (
      <div className='p-8 text-center'>
        <h1 className='text-2xl font-bold text-gray-900 mb-4'>Job Not Found</h1>
        <p className='text-gray-600'>
          The job you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
      </div>
    );
  }

  // Track job view
  const { data: existingView } = await serverSupabase
    .from('job_views')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .eq('contractor_id', user.id)
    .single();

  if (!existingView) {
    await serverSupabase.from('job_views').insert({
      job_id: resolvedParams.id,
      contractor_id: user.id,
      viewed_at: new Date().toISOString(),
      view_count: 1,
    });
  } else {
    await serverSupabase
      .from('job_views')
      .update({
        last_viewed_at: new Date().toISOString(),
        view_count: (existingView.view_count || 0) + 1,
      })
      .eq('id', existingView.id);
  }

  // Check if contractor has already bid on this job
  const { data: existingBid } = await serverSupabase
    .from('bids')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .eq('contractor_id', user.id)
    .single();

  // 2026-05-13 audit fix: the contractor view used to read photos from
  // `jobs.photos` (a JSONB column that's effectively empty — modern
  // job creation writes to the `job_attachments` table instead), so
  // contractors were bidding without ever seeing the homeowner's
  // posting photos. Pull them now and re-sign the URLs (`Job-storage`
  // bucket is private 2026-04-17). Merge into job.photos so the
  // existing JobDetailsClient.photos rendering keeps working with no
  // other changes.
  const { data: jobAttachments } = await serverSupabase
    .from('job_attachments')
    .select('file_url, uploaded_at')
    .eq('job_id', resolvedParams.id)
    .eq('file_type', 'image')
    .order('uploaded_at', { ascending: true });

  const attachmentUrls = (jobAttachments ?? [])
    .map((a) => a.file_url as string | null)
    .filter((u): u is string => Boolean(u));

  const signedPhotoUrls =
    attachmentUrls.length > 0
      ? (await resignJobStorageUrls(attachmentUrls)).filter((u): u is string =>
          Boolean(u)
        )
      : [];

  // Honour any legacy URLs that might still live on jobs.photos so a
  // historical job posted before the job_attachments migration still
  // renders its photos.
  const legacyPhotos = Array.isArray((job as { photos?: unknown }).photos)
    ? ((job as { photos: unknown[] }).photos.filter(
        (p): p is string => typeof p === 'string'
      ) as string[])
    : [];

  const enrichedJob = {
    ...job,
    photos: [...signedPhotoUrls, ...legacyPhotos],
  };

  return (
    <JobDetailsClient
      job={enrichedJob}
      homeowner={job.homeowner}
      existingBid={existingBid}
    />
  );
}
