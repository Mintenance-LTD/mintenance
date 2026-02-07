import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface NotificationJobContext {
  id: string;
  title: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface NotificationPayload {
  required_skills?: string[] | null;
  show_budget_to_contractors?: boolean;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
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

  async notifyNearbyContractors(job: NotificationJobContext, payload: NotificationPayload): Promise<void> {
    if (!job.location && (!job.latitude || !job.longitude)) {
      return;
    }

    try {
      const coordinates = await this.resolveCoordinates(job);
      if (!coordinates) return;

      const contractors = await this.fetchNearbyContractors(coordinates);
      if (contractors.length === 0) return;

      const contractorsToNotify = await this.filterContractorsBySkills(contractors, payload.required_skills);
      await this.createNotifications(job, payload, contractorsToNotify);
    } catch (error) {
      logger.error('Error creating job_nearby notifications', error, {
        service: 'jobs',
        jobId: job.id,
      });
    }
  }

  private async resolveCoordinates(job: NotificationJobContext): Promise<{ lat: number; lng: number } | null> {
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
        const geocodeResult = await geocodeWithTimeout(job.location, apiKey, 5000);
        const coordinates = { lat: geocodeResult.latitude, lng: geocodeResult.longitude };
        await this.saveCoordinates(job.id, coordinates.lat, coordinates.lng);
        return coordinates;
      } catch (error) {
        logger.warn('Geocoding failed or timed out, continuing without coordinates', {
          service: 'jobs',
          error,
          location: job.location,
        });
        return null;
      }
    }

    if (typeof job.location === 'object' && job.location !== null && 'lat' in job.location && 'lng' in job.location) {
      const lat = job.location.lat;
      const lng = job.location.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        await this.saveCoordinates(job.id, lat, lng);
        return { lat, lng };
      }
    }

    return null;
  }

  private async saveCoordinates(jobId: string, latitude: number, longitude: number): Promise<void> {
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

  private async fetchNearbyContractors(coordinates: { lat: number; lng: number }): Promise<ContractorRecord[]> {
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
      const lat = typeof contractor.latitude === 'number' ? contractor.latitude : undefined;
      const lng = typeof contractor.longitude === 'number' ? contractor.longitude : undefined;
      if (lat === undefined || lng === undefined) {
        return false;
      }
      return this.calculateDistance(coordinates.lat, coordinates.lng, lat, lng) <= 25;
    });
  }

  private async filterContractorsBySkills(
    contractors: ContractorRecord[],
    requiredSkills?: string[] | null
  ): Promise<ContractorRecord[]> {
    if (!requiredSkills || requiredSkills.length === 0) {
      return contractors;
    }

    const contractorIds = contractors.map(c => c.id);
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
        .filter((cs: ContractorSkillRecord) => cs.contractor_id === contractor.id)
        .map((cs: ContractorSkillRecord) => cs.skill_name);

      return requiredSkills.some(skill => contractorSkillNames.includes(skill));
    });

    return matches.length > 0 ? matches : contractors;
  }

  private async createNotifications(
    job: NotificationJobContext,
    payload: NotificationPayload,
    contractors: ContractorRecord[]
  ): Promise<void> {
    if (contractors.length === 0) return;

    const notifications = contractors.map((contractor: ContractorRecord) => {
      const budgetText = this.getBudgetText(payload);
      const skillsText = payload.required_skills && payload.required_skills.length > 0
        ? `Requires: ${payload.required_skills.join(', ')}. `
        : '';

      return {
        user_id: contractor.id,
        title: 'New Job Near You',
        message: `New job "${job.title}" posted near you. ${skillsText}Budget: ${budgetText}`,
        type: 'job_nearby',
        read: false,
        action_url: `/jobs/${job.id}`,
        created_at: new Date().toISOString(),
      };
    });

    const { error } = await serverSupabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      logger.error('Failed to create job_nearby notifications', error, {
        service: 'jobs',
        jobId: job.id,
      });
      return;
    }

    logger.info('Created job_nearby notifications', {
      service: 'jobs',
      jobId: job.id,
      contractorCount: notifications.length,
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  private getBudgetText(payload: NotificationPayload): string {
    if (!payload.show_budget_to_contractors && payload.budget_min && payload.budget_max) {
      return `£${payload.budget_min.toLocaleString()}-£${payload.budget_max.toLocaleString()}`;
    }
    if (payload.budget) {
      return `£${payload.budget.toLocaleString()}`;
    }
    return 'Negotiable';
  }
}
