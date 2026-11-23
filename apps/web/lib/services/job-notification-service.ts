import { matchesRecurringTrade } from './recurring/recurring-category';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  fetchNearbyContractors,
  type AudienceContractor,
} from '@/lib/services/job-notification-audience';
import { nextPreferredWindowStart } from '@/lib/services/matching/preferred-hours';

export interface NotificationJobContext {
  id: string;
  title: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** jobs.city — enables area_type='cities' service-area matches. */
  city?: string | null;
}

export interface NotificationPayload {
  recurring?: { category: string; contractorId?: string };
  required_skills?: string[] | null;
}

export interface JobInvite {
  user_id: string;
  type: 'job_nearby' | 'job_invitation_from_repeat_client';
  title: string;
  message: string;
  scheduled_for?: string;
}

export class JobNotificationService {
  private static instance = new JobNotificationService();
  private constructor() {}

  static getInstance(): JobNotificationService {
    return JobNotificationService.instance;
  }

  async planNearbyInvites(
    job: NotificationJobContext,
    payload: NotificationPayload
  ): Promise<JobInvite[]> {
    const coordinates = await this.resolveCoordinates(job);
    if (!coordinates) return [];
    let audience = await fetchNearbyContractors(coordinates, job.city);
    if (!audience.length) return [];

    if (payload.recurring) {
      const { category, contractorId } = payload.recurring;
      const { data: skills, error } = await serverSupabase
        .from('contractor_skills')
        .select('contractor_id,skill_name')
        .in(
          'contractor_id',
          audience.map((contractor) => contractor.id)
        );
      if (error)
        throw new Error('Recurring trade audience could not be checked');
      audience = audience.filter(
        (contractor) =>
          (!contractorId || contractor.id === contractorId) &&
          skills?.some(
            (skill) =>
              skill.contractor_id === contractor.id &&
              matchesRecurringTrade(category, skill.skill_name)
          )
      );
    }
    if (!audience.length) return [];

    const matches = await this.filterContractorsBySkills(
      audience,
      payload.required_skills
    );
    const skillsText = payload.required_skills?.length
      ? ' Requires: ' + payload.required_skills.join(', ') + '.'
      : '';
    return matches
      .sort(
        (a, b) =>
          (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
          a.id.localeCompare(b.id)
      )
      .slice(0, 50)
      .map((contractor) => {
        const deferUntil =
          contractor.matchedVia === 'service_area'
            ? nextPreferredWindowStart(
                contractor.preferredDays,
                contractor.preferredHours
              )
            : null;
        return {
          user_id: contractor.id,
          type: 'job_nearby',
          title: 'New Job Near You',
          message:
            'New job "' +
            job.title +
            '" posted near you.' +
            skillsText +
            ' Submit your bid to be considered.',
          scheduled_for: deferUntil?.toISOString(),
        };
      });
  }

  private async resolveCoordinates(job: NotificationJobContext) {
    if (job.latitude != null && job.longitude != null)
      return { lat: job.latitude, lng: job.longitude };
    if (!job.location) return null;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('Job geocoding is unavailable');
    const { geocodeWithTimeout } = await import('@/lib/utils/api-timeout');
    const result = await geocodeWithTimeout(job.location, apiKey, 5000);
    return { lat: result.latitude, lng: result.longitude };
  }

  private async filterContractorsBySkills(
    contractors: AudienceContractor[],
    requiredSkills?: string[] | null
  ): Promise<AudienceContractor[]> {
    if (!requiredSkills || requiredSkills.length === 0) {
      return contractors;
    }

    const contractorIds = contractors.map((c) => c.id);
    const { data: contractorSkills, error } = await serverSupabase
      .from('contractor_skills')
      .select('contractor_id, skill_name')
      .in('contractor_id', contractorIds);

    if (error) throw new Error('Matching skills could not be loaded');
    interface ContractorSkillRecord {
      contractor_id: string;
      skill_name: string;
    }

    const matches = contractors.filter((contractor: AudienceContractor) => {
      const contractorSkillNames = (contractorSkills || [])
        .filter(
          (cs: ContractorSkillRecord) => cs.contractor_id === contractor.id
        )
        .map((cs: ContractorSkillRecord) => cs.skill_name);

      return requiredSkills.some((skill) =>
        contractorSkillNames.includes(skill)
      );
    });

    return matches.length > 0 ? matches : contractors;
  }

  async planPreferredInvite(
    contractorId: string,
    jobTitle: string,
    requesterId: string
  ): Promise<JobInvite | null> {
    const { data: contractor, error: contractorError } = await serverSupabase
      .from('profiles')
      .select('id')
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .is('deleted_at', null)
      .maybeSingle();
    if (contractorError)
      throw new Error('Preferred contractor could not be checked');
    if (!contractor) return null;

    const { data: requester, error: requesterError } = await serverSupabase
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', requesterId)
      .is('deleted_at', null)
      .maybeSingle();
    if (requesterError) throw new Error('Job requester could not be checked');
    if (!requester) return null;
    const name =
      [requester.first_name, requester.last_name].filter(Boolean).join(' ') ||
      'A previous client';

    return {
      user_id: contractorId,
      type: 'job_invitation_from_repeat_client',
      title: name + ' invited you to bid',
      message: 'You were invited to bid on "' + jobTitle + '".',
    };
  }
}
