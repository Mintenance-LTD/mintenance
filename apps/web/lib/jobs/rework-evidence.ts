import { serverSupabase } from '@/lib/api/supabaseServer';

export interface ReworkRequest {
  id: string;
  comments: string;
  created_at: string;
  completion_version: string | null;
}

export async function getJobReworkRequests(
  jobId: string
): Promise<ReworkRequest[]> {
  const { data, error } = await serverSupabase
    .from('job_rework_requests')
    .select('id, comments, created_at, completion_version')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Only verified evidence uploaded after the latest request can complete rework. */
export async function getCompletionEvidence(jobId: string, since?: string) {
  let query = serverSupabase
    .from('job_photos_metadata')
    .select('photo_url, angle_type, quality_score')
    .eq('job_id', jobId)
    .eq('photo_type', 'after')
    .eq('verified', true);
  if (since) query = query.gt('created_at', since);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    url: p.photo_url,
    angleType: p.angle_type,
    qualityScore: p.quality_score,
  }));
}
