import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
export async function createJobOnce(
  userId: string,
  requestId: string,
  fingerprint: string,
  job: Record<string, unknown>,
  photos: string[],
  tenantReportId?: string
) {
  const args = {
    p_user_id: userId,
    p_request_id: requestId,
    p_fingerprint: fingerprint,
    p_job: job,
    p_photo_urls: photos,
  };
  const { data, error } = tenantReportId
    ? await serverSupabase.rpc('create_job_from_tenant_report_once', {
        ...args,
        p_report_id: tenantReportId,
      })
    : await serverSupabase.rpc('create_job_once', args);
  if (error?.code === '42501' && tenantReportId)
    throw new ForbiddenError('This tenant report is unavailable.');
  if (error?.code === '23514' && tenantReportId)
    throw new ConflictError(
      'The tenant report is closed, already linked, or belongs to another property. Open Tenant Reports to check its status.'
    );
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
