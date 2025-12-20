/**
 * MarketingValidationService
 * 
 * Handles validation logic for marketing campaigns, leads, and content.
 */

import {
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ContentCreationRequest,
} from './types';

export class MarketingValidationService {
  async validateCreateCampaignRequest(request: CreateCampaignRequest): Promise<void> {
    const errors: string[] = [];

    if (!request.contractorId) {
      errors.push('Contractor ID is required');
    }

    if (!request.name || request.name.trim().length === 0) {
      errors.push('Campaign name is required');
    }

    if (!request.type) {
      errors.push('Campaign type is required');
    }

    if (!request.budget || request.budget <= 0) {
      errors.push('Budget must be greater than 0');
    }

    if (!request.startDate) {
      errors.push('Start date is required');
    }

    if (request.endDate && new Date(request.endDate) <= new Date(request.startDate)) {
      errors.push('End date must be after start date');
    }

    if (!request.targetAudience) {
      errors.push('Target audience is required');
    } else {
      this.validateTargetAudience(request.targetAudience, errors);
    }

    if (!request.objectives || request.objectives.length === 0) {
      errors.push('At least one objective is required');
    } else {
      request.objectives.forEach((objective, index) => {
        this.validateCampaignObjective(objective, index, errors);
      });
    }

    if (!request.channels || request.channels.length === 0) {
      errors.push('At least one marketing channel is required');
    } else {
      request.channels.forEach((channel, index) => {
        this.validateMarketingChannel(channel, index, errors);
      });
    }

    if (request.name && request.name.length > 100) {
      errors.push('Campaign name must be 100 characters or less');
    }

    if (request.budget > 1000000) {
      errors.push('Budget cannot exceed $1,000,000');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  async validateUpdateCampaignRequest(request: UpdateCampaignRequest): Promise<void> {
    const errors: string[] = [];

    if (!request.id) {
      errors.push('Campaign ID is required');
    }

    if (!request.updates || Object.keys(request.updates).length === 0) {
      errors.push('At least one field must be updated');
    }

    if (request.updates.name !== undefined) {
      if (!request.updates.name || request.updates.name.trim().length === 0) {
        errors.push('Campaign name cannot be empty');
      }
      if (request.updates.name.length > 100) {
        errors.push('Campaign name must be 100 characters or less');
      }
    }

    if (request.updates.budget !== undefined) {
      if (request.updates.budget <= 0) {
        errors.push('Budget must be greater than 0');
      }
      if (request.updates.budget > 1000000) {
        errors.push('Budget cannot exceed $1,000,000');
      }
    }

    if (request.updates.endDate !== undefined && request.updates.endDate) {
      // Would need to get start date from existing campaign to validate
      // For now, just check it's a valid date
      if (new Date(request.updates.endDate) <= new Date()) {
        errors.push('End date must be in the future');
      }
    }

    if (request.updates.targetAudience) {
      this.validateTargetAudience(request.updates.targetAudience, errors);
    }

    if (request.updates.objectives) {
      request.updates.objectives.forEach((objective, index) => {
        this.validateCampaignObjective(objective, index, errors);
      });
    }

    if (request.updates.channels) {
      request.updates.channels.forEach((channel, index) => {
        this.validateMarketingChannel(channel, index, errors);
      });
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  validateContentCreationRequest(request: ContentCreationRequest): void {
    const errors: string[] = [];

    if (!request.contractorId) {
      errors.push('Contractor ID is required');
    }

    if (!request.type) {
      errors.push('Content type is required');
    }

    if (!request.title || request.title.trim().length === 0) {
      errors.push('Content title is required');
    }

    if (!request.callToAction || request.callToAction.trim().length === 0) {
      errors.push('Call to action is required');
    }

    if (!request.platforms || request.platforms.length === 0) {
      errors.push('At least one platform is required');
    }

    if (request.title && request.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    if (request.description && request.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    if (request.callToAction && request.callToAction.length > 50) {
      errors.push('Call to action must be 50 characters or less');
    }

    if (request.mediaUrls && request.mediaUrls.length > 10) {
      errors.push('Maximum 10 media URLs allowed');
    }

    if (request.scheduledDate && new Date(request.scheduledDate) <= new Date()) {
      errors.push('Scheduled date must be in the future');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  validateLeadData(leadData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    serviceInterest: string[];
    urgency: string;
  }): void {
    const errors: string[] = [];

    if (!leadData.firstName || leadData.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!leadData.lastName || leadData.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!leadData.email || leadData.email.trim().length === 0) {
      errors.push('Email is required');
    }

    if (!this.isValidEmail(leadData.email)) {
      errors.push('Invalid email format');
    }

    if (leadData.phone && !this.isValidPhone(leadData.phone)) {
      errors.push('Invalid phone number format');
    }

    if (!leadData.serviceInterest || leadData.serviceInterest.length === 0) {
      errors.push('At least one service interest is required');
    }

    if (!leadData.urgency || !['low', 'medium', 'high'].includes(leadData.urgency)) {
      errors.push('Invalid urgency level');
    }

    if (leadData.firstName && leadData.firstName.length > 50) {
      errors.push('First name must be 50 characters or less');
    }

    if (leadData.lastName && leadData.lastName.length > 50) {
      errors.push('Last name must be 50 characters or less');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  private validateTargetAudience(audience: any, errors: string[]): void {
    if (!audience.demographics) {
      errors.push('Demographics are required');
    } else {
      if (!audience.demographics.ageRange || audience.demographics.ageRange.length !== 2) {
        errors.push('Age range must have exactly 2 values');
      } else {
        const [min, max] = audience.demographics.ageRange;
        if (min < 18 || max > 100 || min > max) {
          errors.push('Invalid age range');
        }
      }

      if (!audience.demographics.location || audience.demographics.location.length === 0) {
        errors.push('At least one location is required');
      }
    }

    if (!audience.behaviors) {
      errors.push('Behaviors are required');
    }

    if (audience.size !== undefined && audience.size <= 0) {
      errors.push('Audience size must be greater than 0');
    }

    if (audience.reach !== undefined && audience.reach <= 0) {
      errors.push('Audience reach must be greater than 0');
    }
  }

  private validateCampaignObjective(objective: any, index: number, errors: string[]): void {
    if (!objective.type) {
      errors.push(`Objective ${index + 1}: Type is required`);
    }

    if (!['awareness', 'leads', 'conversions', 'engagement', 'traffic'].includes(objective.type)) {
      errors.push(`Objective ${index + 1}: Invalid type`);
    }

    if (!objective.target || objective.target <= 0) {
      errors.push(`Objective ${index + 1}: Target must be greater than 0`);
    }

    if (!objective.weight || objective.weight <= 0 || objective.weight > 1) {
      errors.push(`Objective ${index + 1}: Weight must be between 0 and 1`);
    }
  }

  private validateMarketingChannel(channel: any, index: number, errors: string[]): void {
    if (!channel.platform) {
      errors.push(`Channel ${index + 1}: Platform is required`);
    }

    if (!channel.budget || channel.budget <= 0) {
      errors.push(`Channel ${index + 1}: Budget must be greater than 0`);
    }

    if (channel.budget > 100000) {
      errors.push(`Channel ${index + 1}: Budget cannot exceed $100,000`);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  }
}
