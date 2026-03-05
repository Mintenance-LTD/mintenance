import { ContractorMeeting } from '@mintenance/types';
import type { DatabaseMeetingRow, SupabaseError } from './types';

export function normalizeSupabaseError(error: Error | unknown, fallbackMessage: string): Error {
  if (!error) return new Error(fallbackMessage);
  if (error instanceof Error) return error;
  const supabaseError = error as SupabaseError;
  const messageCandidate = [
    typeof supabaseError.message === 'string' && supabaseError.message.trim(),
    typeof supabaseError.error_description === 'string' && supabaseError.error_description.trim(),
    typeof supabaseError.details === 'string' && supabaseError.details.trim(),
    typeof supabaseError.hint === 'string' && supabaseError.hint.trim(),
  ].find((value) => value);
  return new Error((messageCandidate as string) || fallbackMessage);
}

export function mapDatabaseToMeeting(data: DatabaseMeetingRow): ContractorMeeting {
  return {
    id: data.id,
    job_id: data.job_id,
    homeowner_id: data.homeowner_id,
    contractor_id: data.contractor_id,
    scheduled_datetime: data.scheduled_datetime,
    status: data.status,
    meeting_type: data.meeting_type,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address,
    duration: data.duration,
    notes: data.notes,
    created_at: data.created_at,
    updated_at: data.updated_at,
    homeowner: data.homeowner ? {
      id: data.homeowner.id,
      email: data.homeowner.email,
      first_name: data.homeowner.first_name,
      last_name: data.homeowner.last_name,
      role: 'homeowner' as const,
      created_at: data.homeowner.created_at || new Date().toISOString(),
      updated_at: data.homeowner.updated_at || new Date().toISOString(),
      phone: data.homeowner.phone,
      profile_image_url: data.homeowner.profile_image_url,
    } : undefined,
    contractor: data.contractor ? {
      id: data.contractor.id,
      email: data.contractor.email,
      first_name: data.contractor.first_name,
      last_name: data.contractor.last_name,
      role: 'contractor' as const,
      created_at: data.contractor.created_at || new Date().toISOString(),
      updated_at: data.contractor.updated_at || new Date().toISOString(),
      phone: data.contractor.phone,
      profile_image_url: data.contractor.profile_image_url,
      rating: data.contractor.rating,
    } : undefined,
    job: data.job ? { id: data.job.id, title: data.job.title } : undefined,
  };
}
