import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

interface NotificationJobContext {
  id: string;
  title: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface NotificationPayload {
  required_skills?: string[] | null;
}

interface ContractorRecord {
  id: string;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

export class JobNotificationService {
  private static instance: JobNotificationService;
  private constructor() {}

  static getInstance(): JobNotificationService {
    if (!JobNotificationService.instance) {
      JobNotificationService.instance = new JobNotificationService();
    }
    return JobNotificationService.instance;
  }

  async notifyNearbyContractors(
    job: NotificationJobContext,
    payload: NotificationPayload
  ): Promise<void> {
    if (!job.location && (!job.latitude || !job.longitude)) {
      return;
    }

    try {
      const coordinates = await this.resolveCoordinates(job);
      if (!coordinates) return;

      const contractors = await this.fetchNearbyContractors(coordinates);
      if (contractors.length === 0) return;

      const contractorsToNotify = await this.filterContractorsBySkills(
        contractors,
        payload.required_skills
      );
      await this.createNotifications(job, payload, contractorsToNotify);
    } catch (error) {
      logger.error('Error creating job_nearby notifications', error, {
        service: 'jobs',
        jobId: job.id,
      });
    }
  }

  private async resolveCoordinates(
    job: NotificationJobContext
  ): Promise<{ lat: number; lng: number } | null> {
    if (job.latitude && job.longitude) {
      return { lat: job.latitude, lng: job.longitude };
    }

    if (!job.location) {
      return null;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return null;
    }

    if (typeof job.location === 'string') {
      try {
        const { geocodeWithTimeout } = await import('@/lib/utils/api-timeout');
        const geocodeResult = await geocodeWithTimeout(
          job.location,
          apiKey,
          5000
        );
        const coordinates = {
          lat: geocodeResult.latitude,
          lng: geocodeResult.longitude,
        };
        await this.saveCoordinates(job.id, coordinates.lat, coordinates.lng);
        return coordinates;
      } catch (error) {
        logger.warn(
          'Geocoding failed or timed out, continuing without coordinates',
          {
            service: 'jobs',
            error,
            location: job.location,
          }
        );
        return null;
      }
    }

    if (
      typeof job.location === 'object' &&
      job.location !== null &&
      'lat' in (job.location as Record<string, unknown>) &&
      'lng' in (job.location as Record<string, unknown>)
    ) {
      const lat = (job.location as unknown as { lat: unknown }).lat;
      const lng = (job.location as unknown as { lng: unknown }).lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        await this.saveCoordinates(job.id, lat, lng);
        return { lat, lng };
      }
    }

    return null;
  }

  private async saveCoordinates(
    jobId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    try {
      await serverSupabase
        .from('jobs')
        .update({ latitude, longitude })
        .eq('id', jobId);

      logger.info('Updated job with geocoding data', {
        service: 'jobs',
        jobId,
        lat: latitude,
        lng: longitude,
      });
    } catch (error) {
      logger.warn('Failed to update job coordinates', {
        service: 'jobs',
        jobId,
        error,
      });
    }
  }

  private async fetchNearbyContractors(coordinates: {
    lat: number;
    lng: number;
  }): Promise<ContractorRecord[]> {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('id, first_name, last_name, latitude, longitude, is_available')
      .eq('role', 'contractor')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('is_available', true);

    if (error || !data) {
      return [];
    }

    return data.filter((contractor: ContractorRecord) => {
      const lat =
        typeof contractor.latitude === 'number'
          ? contractor.latitude
          : undefined;
      const lng =
        typeof contractor.longitude === 'number'
          ? contractor.longitude
          : undefined;
      if (lat === undefined || lng === undefined) {
        return false;
      }
      return (
        this.calculateDistance(coordinates.lat, coordinates.lng, lat, lng) <= 25
      );
    });
  }

  private async filterContractorsBySkills(
    contractors: ContractorRecord[],
    requiredSkills?: string[] | null
  ): Promise<ContractorRecord[]> {
    if (!requiredSkills || requiredSkills.length === 0) {
      return contractors;
    }

    const contractorIds = contractors.map((c) => c.id);
    const { data: contractorSkills } = await serverSupabase
      .from('contractor_skills')
      .select('contractor_id, skill_name')
      .in('contractor_id', contractorIds);

    interface ContractorSkillRecord {
      contractor_id: string;
      skill_name: string;
    }

    const matches = contractors.filter((contractor: ContractorRecord) => {
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

  private async createNotifications(
    job: NotificationJobContext,
    payload: NotificationPayload,
    contractors: ContractorRecord[]
  ): Promise<void> {
    if (contractors.length === 0) return;

    // 2026-05-01 audit follow-up: previous version wrote a bulk insert
    // with `read: false` (canonical column is `read` ✓) but bypassed
    // `NotificationService.createNotification` so push + preference
    // checks didn't fire. Fan out per-contractor through the service so
    // every recipient gets the same push pipeline as a 1:1 notification.
    // Fan-out is parallel via Promise.allSettled so a single contractor's
    // preference / push failure doesn't block the rest.
    // 2026-05-22: budget removed from broadcast text. Homeowner-set
    // budgets stopped being collected on new jobs, and legacy budgets
    // shouldn't anchor contractors either. They quote based on the
    // job description + photos.
    const skillsText =
      payload.required_skills && payload.required_skills.length > 0
        ? `Requires: ${payload.required_skills.join(', ')}. `
        : '';

    const results = await Promise.allSettled(
      contractors.map((contractor: ContractorRecord) =>
        NotificationService.createNotification({
          userId: contractor.id,
          type: 'job_nearby',
          title: 'New Job Near You',
          message: `New job "${job.title}" posted near you. ${skillsText}Submit your bid to be considered.`,
          actionUrl: `/jobs/${job.id}`,
          metadata: { jobId: job.id },
        })
      )
    );

    const failures = results.filter((r) => r.status === 'rejected').length;
    if (failures > 0) {
      logger.warn('Some job_nearby notifications failed to send', {
        service: 'jobs',
        jobId: job.id,
        failures,
        total: contractors.length,
      });
    }

    logger.info('Created job_nearby notifications', {
      service: 'jobs',
      jobId: job.id,
      contractorCount: contractors.length,
      failures,
    });
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Hire-Again loop closure (2026-05-13): direct, higher-priority
   * invitation to a contractor the homeowner previously hired.
   *
   * Sends a distinct in-app notification (type:
   * `job_invitation_from_repeat_client`) so the contractor's inbox
   * surfaces it above the generic nearby-job feed. The homeowner's
   * display name is resolved best-effort; on lookup failure we fall
   * back to "a previous client".
   *
   * Side-effects only — return is void. Caller must wrap in
   * `.catch()` because preferred-contractor failures must never
   * block the primary job-creation flow.
   */
  async notifyPreferredContractor(
    preferredContractorId: string,
    jobId: string,
    jobTitle: string,
    homeownerId: string
  ): Promise<void> {
    // Skip if the contractor was deleted between hire and rebook
    const { data: contractor, error: contractorErr } = await serverSupabase
      .from('profiles')
      .select('id, role')
      .eq('id', preferredContractorId)
      .eq('role', 'contractor')
      .maybeSingle();

    if (contractorErr || !contractor) {
      logger.info('Preferred contractor no longer exists — skipping invite', {
        service: 'job-notification',
        jobId,
        preferredContractorId,
      });
      return;
    }

    // Resolve homeowner display name (best-effort)
    const { data: homeowner } = await serverSupabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', homeownerId)
      .maybeSingle();

    const homeownerName = homeowner
      ? [homeowner.first_name, homeowner.last_name].filter(Boolean).join(' ') ||
        'a previous client'
      : 'a previous client';

    await NotificationService.createNotification({
      userId: preferredContractorId,
      type: 'job_invitation_from_repeat_client',
      title: `${homeownerName} wants to hire you again`,
      message: `They've posted "${jobTitle}" and chose you specifically. Place your bid before other contractors are notified.`,
      actionUrl: `/contractor/jobs/${jobId}`,
      metadata: {
        job_id: jobId,
        homeowner_id: homeownerId,
        source: 'hire_again',
      },
    });

    logger.info('Preferred contractor invited to bid', {
      service: 'job-notification',
      jobId,
      preferredContractorId,
      homeownerId,
    });
  }
}
