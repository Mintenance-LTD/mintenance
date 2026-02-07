import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateURLs } from '@/lib/security/url-validation';
import { logger, BUSINESS_RULES } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import type { JobDetail, JobSummary, User } from '@mintenance/types';
import { JobNotificationService } from './job-notification-service';

interface JobCreationPayload {
  title: string;
  description?: string;
  status?: string;
  category?: string | null;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  show_budget_to_contractors?: boolean;
  require_itemized_bids?: boolean;
  location?: string | null;
  photoUrls?: string[];
  requiredSkills?: string[];
  property_id?: string;
  latitude?: number;
  longitude?: number;
}

type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const jobSelectFields = `
  id,
  title,
  description,
  status,
  homeowner_id,
  contractor_id,
  category,
  budget,
  location,
  latitude,
  longitude,
  created_at,
  updated_at
`.replace(/\s+/g, ' ').trim();

const mapRowToJobDetail = (row: JobRow): JobDetail => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class JobCreationService {
  private static instance: JobCreationService;
  private notificationService = JobNotificationService.getInstance();

  private constructor() {}

  static getInstance(): JobCreationService {
    if (!JobCreationService.instance) {
      JobCreationService.instance = new JobCreationService();
    }
    return JobCreationService.instance;
  }

  async createJob(user: Pick<User, 'id' | 'role'>, payload: JobCreationPayload): Promise<JobDetail> {
    this.enforceBudgetPhotoRule(user.id, payload);
    await this.validatePhotoUrls(user.id, payload);

    const insertPayload = this.buildInsertPayload(user, payload);
    const jobRow = await this.insertJob(user.id, insertPayload);

    await this.updateSeriousBuyerScore(user.id, jobRow.id, payload);
    await this.saveAttachments(user.id, jobRow.id, payload.photoUrls);

    await this.notificationService.notifyNearbyContractors(
      {
        id: jobRow.id,
        title: jobRow.title,
        location: jobRow.location ?? null,
        latitude: jobRow.latitude ?? null,
        longitude: jobRow.longitude ?? null,
      },
      {
        required_skills: insertPayload.required_skills,
        show_budget_to_contractors: insertPayload.show_budget_to_contractors,
        budget: insertPayload.budget,
        budget_min: insertPayload.budget_min,
        budget_max: insertPayload.budget_max,
      }
    );

    return mapRowToJobDetail(jobRow);
  }

  private enforceBudgetPhotoRule(userId: string, payload: JobCreationPayload): void {
    const budgetThreshold = BUSINESS_RULES.BUDGET_REQUIRES_PHOTOS_THRESHOLD;
    if (payload.budget && payload.budget > budgetThreshold) {
      const hasImages = payload.photoUrls && payload.photoUrls.length > 0;
      if (!hasImages) {
        logger.warn(`Job creation rejected: Budget >£${budgetThreshold} requires images`, {
          service: 'jobs',
          userId,
          budget: payload.budget,
          photoCount: 0,
        });
        throw new BadRequestError(`Jobs with a budget over £${budgetThreshold} must include at least one photo`);
      }
    }
  }

  private async validatePhotoUrls(userId: string, payload: JobCreationPayload): Promise<void> {
    if (!payload.photoUrls || payload.photoUrls.length === 0) {
      return;
    }

    const urlValidation = await validateURLs(payload.photoUrls, true);
    if (urlValidation.invalid.length > 0) {
      logger.warn('Invalid photo URLs rejected in job creation', {
        service: 'jobs',
        userId,
        invalidUrls: urlValidation.invalid,
      });
      throw new BadRequestError(`Invalid photo URLs: ${urlValidation.invalid.map((i: { error: string }) => i.error).join(', ')}`);
    }

    payload.photoUrls = urlValidation.valid;
  }

  private buildInsertPayload(user: Pick<User, 'id'>, payload: JobCreationPayload): {
    title: string;
    homeowner_id: string;
    status: string;
    description?: string;
    category?: string | null;
    budget?: number;
    budget_min?: number;
    budget_max?: number;
    show_budget_to_contractors?: boolean;
    require_itemized_bids?: boolean;
    location?: string | null;
    required_skills?: string[] | null;
    property_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } {
    const budgetThreshold = BUSINESS_RULES.BUDGET_REQUIRES_PHOTOS_THRESHOLD;
    const insertPayload: {
      title: string;
      homeowner_id: string;
      status: string;
      description?: string;
      category?: string | null;
      budget?: number;
      budget_min?: number;
      budget_max?: number;
      show_budget_to_contractors?: boolean;
      require_itemized_bids?: boolean;
      location?: string | null;
      required_skills?: string[] | null;
      property_id?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } = {
      title: payload.title.trim(),
      homeowner_id: user.id,
      status: (payload.status ? payload.status.trim() : 'posted'),
    };

    if (typeof payload.description === 'string') {
      insertPayload.description = payload.description.trim();
    }
    if (payload.category !== undefined) {
      insertPayload.category = payload.category?.trim() ?? null;
    }
    if (payload.budget !== undefined) insertPayload.budget = payload.budget;
    if (payload.budget_min !== undefined) insertPayload.budget_min = payload.budget_min;
    if (payload.budget_max !== undefined) insertPayload.budget_max = payload.budget_max;
    if (payload.show_budget_to_contractors !== undefined) {
      insertPayload.show_budget_to_contractors = payload.show_budget_to_contractors;
    }
    if (payload.require_itemized_bids !== undefined) {
      insertPayload.require_itemized_bids = payload.require_itemized_bids;
    } else if (payload.budget && payload.budget > budgetThreshold) {
      insertPayload.require_itemized_bids = true;
    }
    if (payload.location !== undefined) {
      insertPayload.location = payload.location?.trim() ?? null;
    }
    if (payload.requiredSkills !== undefined && Array.isArray(payload.requiredSkills) && payload.requiredSkills.length > 0) {
      insertPayload.required_skills = payload.requiredSkills;
    }
    if (payload.property_id !== undefined) {
      insertPayload.property_id = payload.property_id;
    }
    if (payload.latitude !== undefined && payload.latitude !== null) {
      insertPayload.latitude = payload.latitude;
    }
    if (payload.longitude !== undefined && payload.longitude !== null) {
      insertPayload.longitude = payload.longitude;
    }

    return insertPayload;
  }

  private async insertJob(
    userId: string,
    insertPayload: {
      title: string;
      homeowner_id: string;
      status: string;
      description?: string;
      category?: string | null;
      budget?: number;
      budget_min?: number;
      budget_max?: number;
      show_budget_to_contractors?: boolean;
      require_itemized_bids?: boolean;
      location?: string | null;
      required_skills?: string[] | null;
      property_id?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }
  ): Promise<JobRow> {
    let result = await serverSupabase
      .from('jobs')
      .insert(insertPayload)
      .select(jobSelectFields)
      .single();

    let data = result.data;
    let error = result.error;

    const errorMessage = error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : '';
    const errorCode = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';

    if (error && insertPayload.required_skills && (
      errorMessage.includes('required_skills') ||
      errorCode === '42703' ||
      (errorMessage.includes('column') && errorMessage.includes('required_skills'))
    )) {
      logger.warn('Required_skills column not found, retrying without it', {
        service: 'jobs',
        userId,
        originalError: errorMessage,
      });

      const { required_skills, ...payloadWithoutSkills } = insertPayload;
      result = await serverSupabase
        .from('jobs')
        .insert(payloadWithoutSkills)
        .select(jobSelectFields)
        .single();

      data = result.data;
      error = result.error;
    }

    if (error || !data) {
      logger.error('Failed to create job', error, {
        service: 'jobs',
        userId,
        errorDetails: error,
      });
      throw new InternalServerError('Failed to create job');
    }

    return data as unknown as JobRow;
  }

  private async updateSeriousBuyerScore(
    userId: string,
    jobId: string,
    payload: JobCreationPayload
  ): Promise<void> {
    try {
      const { SeriousBuyerService } = await import('@/lib/services/jobs/SeriousBuyerService');
      const photoUrls = payload.photoUrls || [];
      await SeriousBuyerService.updateScore(jobId, userId, {
        description: payload.description,
        budget: payload.budget,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      });
    } catch (scoreError) {
      logger.error('Failed to calculate serious buyer score', scoreError, {
        service: 'jobs',
        jobId,
      });
    }
  }

  private async saveAttachments(
    userId: string,
    jobId: string,
    photoUrls?: string[]
  ): Promise<void> {
    if (!photoUrls || photoUrls.length === 0) {
      return;
    }

    try {
      const attachments = photoUrls.map((url: string) => ({
        job_id: jobId,
        file_url: url,
        file_type: 'image',
        uploaded_by: userId,
      }));

      const { error } = await serverSupabase
        .from('job_attachments')
        .insert(attachments);

      if (error) {
        logger.warn('Failed to save job attachments', {
          service: 'jobs',
          userId,
          jobId,
          error,
        });
      }
    } catch (attachErr) {
      logger.warn('Error saving job attachments', {
        service: 'jobs',
        userId,
        jobId,
        error: attachErr,
      });
    }
  }
}
