/**
 * GoalManagementService
 * 
 * Main service class for managing contractor goals, milestones, and progress tracking.
 * Orchestrates the various goal management components.
 */

import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { supabase } from '../../config/supabase';
import { GoalRepository } from './GoalRepository';
import { GoalAnalyticsService } from './GoalAnalyticsService';
import { GoalNotificationService } from './GoalNotificationService';
import { GoalValidationService } from './GoalValidationService';
import {
  Goal,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalFilters,
  GoalSortOptions,
  GoalDashboard,
  GoalSearchParams,
} from './types';

export class GoalManagementService {
  private goalRepository: GoalRepository;
  private analyticsService: GoalAnalyticsService;
  private notificationService: GoalNotificationService;
  private validationService: GoalValidationService;

  constructor() {
    this.goalRepository = new GoalRepository();
    this.analyticsService = new GoalAnalyticsService();
    this.notificationService = new GoalNotificationService();
    this.validationService = new GoalValidationService();
  }

  /**
   * Create a new goal for a contractor
   */
  async createGoal(request: CreateGoalRequest): Promise<Goal> {
    try {
      // Validate the goal data
      await this.validationService.validateCreateGoalRequest(request);

      // Create the goal
      const goal = await this.goalRepository.createGoal(request);

      // Set up analytics tracking
      await this.analyticsService.initializeGoalAnalytics(goal.id);

      // Send creation notification
      await this.notificationService.sendGoalCreatedNotification(goal);

      return goal;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create goal');
    }
  }

  /**
   * Get goals for a contractor with filtering and sorting
   */
  async getGoals(
    contractorId: string,
    params?: GoalSearchParams
  ): Promise<{ goals: Goal[]; total: number }> {
    try {
      return await this.goalRepository.getGoals(contractorId, params);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch goals');
    }
  }

  /**
   * Get a specific goal by ID
   */
  async getGoalById(goalId: string): Promise<Goal> {
    try {
      return await this.goalRepository.getGoalById(goalId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch goal');
    }
  }

  /**
   * Update an existing goal
   */
  async updateGoal(request: UpdateGoalRequest): Promise<Goal> {
    try {
      // Validate the update request
      await this.validationService.validateUpdateGoalRequest(request);

      // Update the goal
      const updatedGoal = await this.goalRepository.updateGoal(request);

      // Update analytics if metrics changed
      if (request.updates.metrics) {
        await this.analyticsService.updateGoalAnalytics(updatedGoal.id);
      }

      // Send update notification
      await this.notificationService.sendGoalUpdatedNotification(updatedGoal);

      return updatedGoal;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to update goal');
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    try {
      // Get goal before deletion for notification
      const goal = await this.goalRepository.getGoalById(goalId);

      // Delete the goal
      await this.goalRepository.deleteGoal(goalId);

      // Clean up analytics data
      await this.analyticsService.deleteGoalAnalytics(goalId);

      // Send deletion notification
      await this.notificationService.sendGoalDeletedNotification(goal);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to delete goal');
    }
  }

  /**
   * Get goal dashboard for a contractor
   */
  async getGoalDashboard(contractorId: string): Promise<GoalDashboard> {
    try {
      const goals = await this.goalRepository.getGoals(contractorId);
      return await this.analyticsService.generateDashboard(contractorId, goals.goals);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch goal dashboard');
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    goalId: string,
    progressData: {
      percentage?: number;
      currentValue?: number;
      notes?: string;
      attachments?: string[];
    }
  ): Promise<Goal> {
    try {
      const goal = await this.goalRepository.updateGoalProgress(goalId, progressData);

      // Update analytics
      await this.analyticsService.updateGoalAnalytics(goalId);

      // Check for milestone completions
      await this.checkAndUpdateMilestones(goalId);

      // Send progress notification if significant change
      await this.notificationService.sendProgressUpdateNotification(goal, progressData);

      return goal;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to update goal progress');
    }
  }

  /**
   * Complete a milestone
   */
  async completeMilestone(
    goalId: string,
    milestoneId: string,
    completionData?: {
      notes?: string;
      attachments?: string[];
    }
  ): Promise<Goal> {
    try {
      const goal = await this.goalRepository.completeMilestone(goalId, milestoneId, completionData);

      // Update analytics
      await this.analyticsService.updateGoalAnalytics(goalId);

      // Send milestone completion notification
      await this.notificationService.sendMilestoneCompletedNotification(goal, milestoneId);

      return goal;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to complete milestone');
    }
  }

  /**
   * Get goal analytics
   */
  async getGoalAnalytics(goalId: string): Promise<any> {
    try {
      return await this.analyticsService.getGoalAnalytics(goalId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch goal analytics');
    }
  }

  /**
   * Archive completed goals
   */
  async archiveCompletedGoals(contractorId: string): Promise<number> {
    try {
      return await this.goalRepository.archiveCompletedGoals(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to archive completed goals');
    }
  }

  /**
   * Get goal templates
   */
  async getGoalTemplates(category?: string): Promise<any[]> {
    try {
      return await this.goalRepository.getGoalTemplates(category);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch goal templates');
    }
  }

  /**
   * Create goal from template
   */
  async createGoalFromTemplate(
    templateId: string,
    contractorId: string,
    customizations?: Partial<CreateGoalRequest>
  ): Promise<Goal> {
    try {
      const template = await this.goalRepository.getGoalTemplate(templateId);
      const goalRequest: CreateGoalRequest = {
        ...template,
        contractorId,
        ...customizations,
      };

      return await this.createGoal(goalRequest);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create goal from template');
    }
  }

  /**
   * Private helper method to check and update milestones
   */
  private async checkAndUpdateMilestones(goalId: string): Promise<void> {
    try {
      const goal = await this.goalRepository.getGoalById(goalId);
      
      // Check if any milestones should be automatically completed
      for (const milestone of goal.milestones) {
        if (milestone.status === 'pending' && goal.progress.percentage >= milestone.value) {
          await this.completeMilestone(goalId, milestone.id);
        }
      }
    } catch (error) {
      // Log error but don't throw - this is a background process
      console.error('Error checking milestones:', error);
    }
  }
}
