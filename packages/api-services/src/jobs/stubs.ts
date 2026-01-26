import { logger } from '@mintenance/shared';

/**
 * Placeholder services for JobService - to be implemented/integrated
 */

export class NotificationServiceStub {
    async notifyContractors(job: unknown, contractorIds: string[]) {
        logger.info('Would notify contractors', { jobId: job.id, count: contractorIds.length });
    }
    async notifyNearbyContractors(job: unknown, radiusMiles: number = 50) {
        logger.info('Would notify nearby contractors', { jobId: job.id, radius: radiusMiles });
    }
}

export class GeocodeServiceStub {
    async geocodeAddress(location: string) {
        return { lat: undefined, lng: undefined };
    }
}

export class AIAssessmentServiceStub {
    async createAssessment(jobId: string, photoUrls: string[], description?: string) {
        return { id: null, status: 'pending' };
    }
    async assessJob(data: Record<string, unknown>) {
        return { id: null, confidence_score: 0, urgency: 'normal' };
    }
    async getAssessmentsForJobs(jobIds: string[]) {
        return new Map();
    }
}

export class AttachmentServiceStub {
    async processAttachments(jobId: string, urls: string[]) {
        return urls;
    }
    async createAttachments(jobId: string, attachments: unknown[]) {
        return attachments;
    }
    async updateAttachments(jobId: string, attachments: unknown[]) {
        return attachments;
    }
    async deleteAttachments(jobId: string) {
        return true;
    }
    async getAttachmentsForJobs(jobIds: string[]) {
        return new Map();
    }
}

export const SqlProtectionStub = {
    scanForInjection(input: string) {
        return { isSafe: true, sanitized: input };
    }
};
