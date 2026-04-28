/**
 * Per-job photo aggregator.
 *
 * Gathers display photos for a list of job IDs from the same two tables
 * the canonical job-list reader uses (`job_attachments` first, then
 * `job_photos_metadata` as a fallback for completed jobs that only have
 * lifecycle before/after photos), and re-signs every Job-storage URL in
 * one batch so the caller can render through next/image without
 * worrying about the bucket-flip TTL.
 *
 * Use this from server pages that render job thumbnails outside the
 * /api/jobs list path — most notably the contractor profile portfolio,
 * which previously read `jobs.photos` directly and rendered empty cards
 * for completed jobs whose photos live in `job_photos_metadata`.
 */
import { serverSupabase } from './supabaseServer';
import { resignJobStorageUrls } from './job-storage';

export async function getJobPhotosByJobId(
  jobIds: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (jobIds.length === 0) return result;

  const [attachmentsRes, metadataRes] = await Promise.all([
    serverSupabase
      .from('job_attachments')
      .select('job_id, file_url')
      .in('job_id', jobIds)
      .eq('file_type', 'image'),
    serverSupabase
      .from('job_photos_metadata')
      .select('job_id, photo_url, photo_type, captured_at')
      .in('job_id', jobIds)
      .order('captured_at', { ascending: false }),
  ]);

  const attachmentsByJob = new Map<string, string[]>();
  for (const row of (attachmentsRes.data ?? []) as Array<{
    job_id: string;
    file_url: string;
  }>) {
    if (!attachmentsByJob.has(row.job_id)) attachmentsByJob.set(row.job_id, []);
    attachmentsByJob.get(row.job_id)!.push(row.file_url);
  }

  const metadataByJob = new Map<string, string[]>();
  // Sort 'after' first within each job so completed-job thumbnails show
  // the finished state — matches the JobQueryService convention.
  const metadataRows = (
    (metadataRes.data ?? []) as Array<{
      job_id: string;
      photo_url: string;
      photo_type: string | null;
    }>
  ).sort((a, b) => {
    const aw = a.photo_type === 'after' ? 0 : 1;
    const bw = b.photo_type === 'after' ? 0 : 1;
    return aw - bw;
  });
  for (const row of metadataRows) {
    if (!metadataByJob.has(row.job_id)) metadataByJob.set(row.job_id, []);
    metadataByJob.get(row.job_id)!.push(row.photo_url);
  }

  // Per-job: prefer attachments; fall back to metadata photos.
  const rawPerJob: Array<{ jobId: string; urls: string[] }> = jobIds.map(
    (jobId) => {
      const attachments = attachmentsByJob.get(jobId) ?? [];
      const urls =
        attachments.length > 0 ? attachments : (metadataByJob.get(jobId) ?? []);
      return { jobId, urls };
    }
  );

  // Batch-resign all URLs in one round trip, then re-chunk per job.
  const allUrls = rawPerJob.flatMap((r) => r.urls);
  const allSigned = await resignJobStorageUrls(allUrls);
  let offset = 0;
  for (const { jobId, urls } of rawPerJob) {
    const signed = allSigned.slice(offset, offset + urls.length);
    offset += urls.length;
    if (signed.length > 0) result.set(jobId, signed);
  }
  return result;
}
