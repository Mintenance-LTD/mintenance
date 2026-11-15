import { serverSupabase } from '@/lib/api/supabaseServer';
import { ConflictError, InternalServerError } from '@/lib/errors/api-error';
export async function createJobOnce(
  userId: string,
  requestId: string,
  fingerprint: string,
  job: Record<string, unknown>,
  photos: string[]
) {
  const { data, error } = await serverSupabase.rpc('create_job_once', {
    p_user_id: userId,
    p_request_id: requestId,
    p_fingerprint: fingerprint,
    p_job: job,
    p_photo_urls: photos,
  });
  if (error?.code === '22023' || error?.code === 'P0002')
    throw new ConflictError(
      'This submission already belongs to a different or removed job. Check your jobs before starting again.'
    );
  if (error || !data?.job?.id || typeof data.created !== 'boolean')
    throw new InternalServerError(
      'Unable to confirm job creation. Retry this submission.'
    );
  return data as {
    job: {
      id: string;
      title: string;
      status: string;
      created_at: string;
      updated_at: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      city?: string;
    };
    created: boolean;
  };
}
