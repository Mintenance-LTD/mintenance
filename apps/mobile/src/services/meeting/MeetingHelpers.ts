import { ContractorMeeting } from '@mintenance/types';
import type { DatabaseMeetingRow, SupabaseError } from './types';

// 2026-05-27 audit-78 P1: shape of an `appointments` row as PostgREST
// returns it via the /api/contractor/appointments[/[id]] endpoints.
// Optional joins (client/contractor/job) match the SELECT shape on
// those routes. We don't model every column — only the ones the
// mobile coercer needs.
export interface AppointmentRow {
  id: string;
  contractor_id: string;
  client_id: string | null;
  job_id: string | null;
  title: string;
  appointment_date: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  location_type: string | null;
  location_address: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  client?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone?: string | null;
    profile_image_url?: string | null;
  } | null;
  contractor?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone?: string | null;
    profile_image_url?: string | null;
  } | null;
  job?: {
    id: string;
    title: string | null;
    status?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location?: string | null;
  } | null;
}

/**
 * 2026-05-27 audit-78 P1: coerce an appointments row into the
 * ContractorMeeting shape the mobile UI expects. The two tables have
 * different column names + don't capture lat/lng; we synthesise
 * scheduled_datetime from `${appointment_date}T${start_time}` and
 * leave latitude/longitude as 0 so the map falls back gracefully.
 * job.title carries through the linked job for the header card.
 */
export function mapAppointmentToMeeting(
  apt: AppointmentRow
): ContractorMeeting {
  const scheduledIso = `${apt.appointment_date}T${apt.start_time}`;
  const meetingType =
    apt.location_type === 'phone'
      ? 'consultation'
      : apt.location_type === 'remote'
        ? 'consultation'
        : 'site_visit';
  return {
    id: apt.id,
    job_id: apt.job_id ?? '',
    homeowner_id: apt.client_id ?? '',
    contractor_id: apt.contractor_id,
    scheduled_datetime: scheduledIso,
    status:
      (apt.status as ContractorMeeting['status']) ??
      ('scheduled' as ContractorMeeting['status']),
    meeting_type: meetingType,
    latitude: apt.job?.latitude ?? 0,
    longitude: apt.job?.longitude ?? 0,
    address: apt.location_address ?? apt.job?.location ?? undefined,
    duration: apt.duration_minutes ?? 60,
    notes: apt.notes ?? undefined,
    created_at: apt.created_at ?? new Date().toISOString(),
    updated_at: apt.updated_at ?? new Date().toISOString(),
    homeowner: apt.client
      ? {
          id: apt.client.id,
          email: apt.client.email ?? '',
          first_name: apt.client.first_name ?? '',
          last_name: apt.client.last_name ?? '',
          role: 'homeowner' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: apt.client.phone ?? undefined,
          profile_image_url: apt.client.profile_image_url ?? undefined,
        }
      : undefined,
    contractor: apt.contractor
      ? {
          id: apt.contractor.id,
          email: apt.contractor.email ?? '',
          first_name: apt.contractor.first_name ?? '',
          last_name: apt.contractor.last_name ?? '',
          role: 'contractor' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: apt.contractor.phone ?? undefined,
          profile_image_url: apt.contractor.profile_image_url ?? undefined,
        }
      : undefined,
    job: apt.job ? { id: apt.job.id, title: apt.job.title ?? '' } : undefined,
  };
}

function normalizeSupabaseError(
  error: Error | unknown,
  fallbackMessage: string
): Error {
  if (!error) return new Error(fallbackMessage);
  if (error instanceof Error) return error;
  const supabaseError = error as SupabaseError;
  const messageCandidate = [
    typeof supabaseError.message === 'string' && supabaseError.message.trim(),
    typeof supabaseError.error_description === 'string' &&
      supabaseError.error_description.trim(),
    typeof supabaseError.details === 'string' && supabaseError.details.trim(),
    typeof supabaseError.hint === 'string' && supabaseError.hint.trim(),
  ].find((value) => value);
  return new Error((messageCandidate as string) || fallbackMessage);
}

export function mapDatabaseToMeeting(
  data: DatabaseMeetingRow
): ContractorMeeting {
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
    homeowner: data.homeowner
      ? {
          id: data.homeowner.id,
          email: data.homeowner.email,
          first_name: data.homeowner.first_name,
          last_name: data.homeowner.last_name,
          role: 'homeowner' as const,
          created_at: data.homeowner.created_at || new Date().toISOString(),
          updated_at: data.homeowner.updated_at || new Date().toISOString(),
          phone: data.homeowner.phone,
          profile_image_url: data.homeowner.profile_image_url,
        }
      : undefined,
    contractor: data.contractor
      ? {
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
        }
      : undefined,
    job: data.job ? { id: data.job.id, title: data.job.title } : undefined,
  };
}
