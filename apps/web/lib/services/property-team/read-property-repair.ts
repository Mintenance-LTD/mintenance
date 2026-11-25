import { z } from 'zod';
import {
  extractJobStoragePath,
  signJobStoragePath,
} from '@/lib/api/job-storage';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isJobPhotoPath } from '@/lib/api/storage-object-path';
import { PropertyTeamService } from './PropertyTeamService';

const uuid = z.string().uuid();
const waitingLabels: Record<string, string> = {
  manager: 'Waiting for the property team',
  tenant: 'Waiting for the tenant',
  contractor: 'Waiting for the contractor',
  approval: 'Waiting for approval',
};

export async function readPropertyRepair(
  actorId: string,
  propertyId: string,
  jobId: string
) {
  if (!uuid.safeParse(propertyId).success || !uuid.safeParse(jobId).success) {
    return null;
  }

  const access = await PropertyTeamService.authorize(
    actorId,
    propertyId,
    'view'
  );
  if (!access.authorized) return null;

  const { data: property, error: propertyError } = await serverSupabase
    .from('properties')
    .select('id, owner_id, property_name')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyError) throw propertyError;
  if (!property) return null;

  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select(
      'id, title, description, status, scheduled_start_date, scheduled_end_date, completed_at, completion_confirmed_by_homeowner'
    )
    .eq('id', jobId)
    .eq('property_id', propertyId)
    .eq('homeowner_id', property.owner_id)
    .neq('status', 'draft')
    .maybeSingle();
  if (jobError) throw jobError;
  if (!job) return null;

  const [evidence, followup] = await Promise.all([
    serverSupabase
      .from('job_photos_metadata')
      .select('id, photo_type, storage_path, photo_url, created_at')
      .eq('job_id', jobId)
      .in('photo_type', ['before', 'after'])
      .order('created_at', { ascending: false })
      .limit(40),
    serverSupabase
      .from('property_action_followups')
      .select('waiting_for, due_at')
      .eq('kind', 'job')
      .eq('source_id', jobId)
      .eq('property_id', propertyId)
      .maybeSingle(),
  ]);
  if (evidence.error) throw evidence.error;
  if (followup.error) throw followup.error;

  const photos = await Promise.all(
    (evidence.data ?? []).map(async (photo) => {
      const path = extractJobStoragePath(
        photo.storage_path || photo.photo_url || ''
      );
      // Sign only job-scoped uploads attached to the authorised repair. Stored
      // URLs can be old or external, so never send the stored URL to this client.
      return {
        id: photo.id,
        kind: photo.photo_type as 'before' | 'after',
        url: isJobPhotoPath(path, jobId)
          ? await signJobStoragePath(path, 600)
          : null,
      };
    })
  );

  const nextAction =
    (followup.data && waitingLabels[followup.data.waiting_for]) ||
    (job.status === 'cancelled'
      ? 'Repair cancelled'
      : job.status === 'completed'
        ? job.completion_confirmed_by_homeowner
          ? 'Completion confirmed'
          : 'Waiting for the payer to review completion'
        : job.status === 'posted' || job.status === 'pending'
          ? 'Check for quotes with the property owner'
          : job.scheduled_start_date &&
              new Date(job.scheduled_start_date) > new Date()
            ? 'Review the scheduled work window'
            : 'Check progress with the property team');

  return {
    id: job.id,
    title: job.title,
    description: job.description,
    status: job.status,
    property: { id: property.id, name: property.property_name || 'Property' },
    start: job.scheduled_start_date,
    end: job.scheduled_end_date,
    completedAt: job.completed_at,
    dueAt: followup.data?.due_at ?? null,
    nextAction,
    photos,
    canManageFollowup: PropertyTeamService.canPerform(
      access.role,
      'manage_maintenance'
    ),
  };
}
