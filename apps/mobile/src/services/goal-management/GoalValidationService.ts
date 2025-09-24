/**
 * GoalValidationService
 * 
 * Handles validation logic for goal creation, updates, and business rules.
 */

import {
  CreateGoalRequest,
  UpdateGoalRequest,
  Goal,
} from './types';

export class GoalValidationService {
  /**
   * Validate a create goal request
   */
  async validateCreateGoalRequest(request: CreateGoalRequest): Promise<void> {
    const errors: string[] = [];

    // Validate required fields
    if (!request.contractorId) {
      errors.push('Contractor ID is required');
    }

    if (!request.title || request.title.trim().length === 0) {
      errors.push('Goal title is required');
    }

    if (!request.description || request.description.trim().length === 0) {
      errors.push('Goal description is required');
    }

    if (!request.category) {
      errors.push('Goal category is required');
    }

    if (!request.type) {
      errors.push('Goal type is required');
    }

    if (!request.priority) {
      errors.push('Goal priority is required');
    }

    // Validate timeframe
    if (!request.timeframe) {
      errors.push('Goal timeframe is required');
    } else {
      this.validateTimeframe(request.timeframe, errors);
    }

    // Validate metrics
    if (!request.metrics) {
      errors.push('Goal metrics are required');
    } else {
      this.validateMetrics(request.metrics, errors);
    }

    // Validate title length
    if (request.title && request.title.length > 100) {
      errors.push('Goal title must be 100 characters or less');
    }

    // Validate description length
    if (request.description && request.description.length > 1000) {
      errors.push('Goal description must be 1000 characters or less');
    }

    // Validate tags
    if (request.tags && request.tags.length > 10) {
      errors.push('Maximum 10 tags allowed');
    }

    if (request.tags) {
      request.tags.forEach(tag => {
        if (tag.length > 20) {
          errors.push('Each tag must be 20 characters or less');
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate an update goal request
   */
  async validateUpdateGoalRequest(request: UpdateGoalRequest): Promise<void> {
    const errors: string[] = [];

    if (!request.id) {
      errors.push('Goal ID is required');
    }

    if (!request.updates || Object.keys(request.updates).length === 0) {
      errors.push('At least one field must be updated');
    }

    // Validate individual fields if provided
    if (request.updates.title !== undefined) {
      if (!request.updates.title || request.updates.title.trim().length === 0) {
        errors.push('Goal title cannot be empty');
      }
      if (request.updates.title.length > 100) {
        errors.push('Goal title must be 100 characters or less');
      }
    }

    if (request.updates.description !== undefined) {
      if (!request.updates.description || request.updates.description.trim().length === 0) {
        errors.push('Goal description cannot be empty');
      }
      if (request.updates.description.length > 1000) {
        errors.push('Goal description must be 1000 characters or less');
      }
    }

    if (request.updates.timeframe) {
      this.validateTimeframe(request.updates.timeframe, errors);
    }

    if (request.updates.metrics) {
      this.validateMetrics(request.updates.metrics, errors);
    }

    if (request.updates.tags) {
      if (request.updates.tags.length > 10) {
        errors.push('Maximum 10 tags allowed');
      }
      request.updates.tags.forEach(tag => {
        if (tag.length > 20) {
          errors.push('Each tag must be 20 characters or less');
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate goal progress update
   */
  validateProgressUpdate(progressData: {
    percentage?: number;
    currentValue?: number;
    notes?: string;
    attachments?: string[];
  }): void {
    const errors: string[] = [];

    if (progressData.percentage !== undefined) {
      if (progressData.percentage < 0 || progressData.percentage > 100) {
        errors.push('Progress percentage must be between 0 and 100');
      }
    }

    if (progressData.currentValue !== undefined) {
      if (progressData.currentValue < 0) {
        errors.push('Current value cannot be negative');
      }
    }

    if (progressData.notes && progressData.notes.length > 500) {
      errors.push('Progress notes must be 500 characters or less');
    }

    if (progressData.attachments && progressData.attachments.length > 5) {
      errors.push('Maximum 5 attachments allowed');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate milestone completion
   */
  validateMilestoneCompletion(milestone: any): void {
    const errors: string[] = [];

    if (!milestone.id) {
      errors.push('Milestone ID is required');
    }

    if (!milestone.title || milestone.title.trim().length === 0) {
      errors.push('Milestone title is required');
    }

    if (!milestone.targetDate) {
      errors.push('Milestone target date is required');
    }

    if (milestone.value < 0 || milestone.value > 100) {
      errors.push('Milestone value must be between 0 and 100');
    }

    if (milestone.weight < 0 || milestone.weight > 1) {
      errors.push('Milestone weight must be between 0 and 1');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate timeframe
   */
  private validateTimeframe(timeframe: any, errors: string[]): void {
    if (!timeframe.startDate) {
      errors.push('Start date is required');
    }

    if (!timeframe.endDate) {
      errors.push('End date is required');
    }

    if (timeframe.startDate && timeframe.endDate) {
      const startDate = new Date(timeframe.startDate);
      const endDate = new Date(timeframe.endDate);

      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }

      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (duration < 1) {
        errors.push('Goal duration must be at least 1 day');
      }

      if (duration > 365) {
        errors.push('Goal duration cannot exceed 365 days');
      }
    }

    if (timeframe.duration !== undefined && timeframe.duration < 1) {
      errors.push('Duration must be at least 1 day');
    }

    if (timeframe.isRecurring && timeframe.recurrence) {
      this.validateRecurrence(timeframe.recurrence, errors);
    }
  }

  /**
   * Validate metrics
   */
  private validateMetrics(metrics: any, errors: string[]): void {
    if (metrics.targetValue === undefined || metrics.targetValue === null) {
      errors.push('Target value is required');
    }

    if (metrics.targetValue < 0) {
      errors.push('Target value cannot be negative');
    }

    if (!metrics.unit || metrics.unit.trim().length === 0) {
      errors.push('Unit is required');
    }

    if (!metrics.measurementMethod) {
      errors.push('Measurement method is required');
    }

    if (metrics.currentValue !== undefined && metrics.currentValue < 0) {
      errors.push('Current value cannot be negative');
    }

    if (metrics.thresholds) {
      const { green, yellow, red } = metrics.thresholds;
      if (green !== undefined && yellow !== undefined && red !== undefined) {
        if (green < yellow || yellow < red) {
          errors.push('Threshold values must be in descending order (green > yellow > red)');
        }
      }
    }
  }

  /**
   * Validate recurrence settings
   */
  private validateRecurrence(recurrence: any, errors: string[]): void {
    if (!recurrence.frequency) {
      errors.push('Recurrence frequency is required');
    }

    if (!recurrence.interval || recurrence.interval < 1) {
      errors.push('Recurrence interval must be at least 1');
    }

    if (!recurrence.endCondition) {
      errors.push('Recurrence end condition is required');
    }

    if (recurrence.endCondition === 'count' && (!recurrence.endValue || recurrence.endValue < 1)) {
      errors.push('End count must be at least 1');
    }

    if (recurrence.endCondition === 'date' && !recurrence.endValue) {
      errors.push('End date is required for date-based recurrence');
    }
  }

  /**
   * Validate goal status transition
   */
  validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'draft': ['active', 'cancelled'],
      'active': ['paused', 'completed', 'cancelled', 'overdue'],
      'paused': ['active', 'cancelled'],
      'completed': ['active'], // Allow reopening completed goals
      'cancelled': [], // Cannot transition from cancelled
      'overdue': ['active', 'completed', 'cancelled'],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }
}
