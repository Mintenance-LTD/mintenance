/**
 * GoalNotificationService
 * 
 * Handles all notification-related functionality for goal management,
 * including milestone completions, progress updates, and deadline reminders.
 */

import { supabase } from '../../config/supabase';
import { Goal } from './types';
import { logger } from '../../utils/logger';

export class GoalNotificationService {
  /**
   * Send notification when a goal is created
   */
  async sendGoalCreatedNotification(goal: Goal): Promise<void> {
    try {
      await this.createNotification({
        userId: goal.contractorId,
        type: 'goal_created',
        title: 'New Goal Created',
        message: `Goal "${goal.title}" has been created successfully`,
        data: { goalId: goal.id },
        priority: 'medium',
      });
    } catch (error) {
      logger.error('Failed to send goal created notification', error);
    }
  }

  /**
   * Send notification when a goal is updated
   */
  async sendGoalUpdatedNotification(goal: Goal): Promise<void> {
    try {
      await this.createNotification({
        userId: goal.contractorId,
        type: 'goal_updated',
        title: 'Goal Updated',
        message: `Goal "${goal.title}" has been updated`,
        data: { goalId: goal.id },
        priority: 'low',
      });
    } catch (error) {
      logger.error('Failed to send goal updated notification', error);
    }
  }

  /**
   * Send notification when a goal is deleted
   */
  async sendGoalDeletedNotification(goal: Goal): Promise<void> {
    try {
      await this.createNotification({
        userId: goal.contractorId,
        type: 'goal_deleted',
        title: 'Goal Deleted',
        message: `Goal "${goal.title}" has been deleted`,
        data: { goalId: goal.id },
        priority: 'medium',
      });
    } catch (error) {
      logger.error('Failed to send goal deleted notification', error);
    }
  }

  /**
   * Send notification for progress updates
   */
  async sendProgressUpdateNotification(
    goal: Goal,
    progressData: {
      percentage?: number;
      currentValue?: number;
      notes?: string;
    }
  ): Promise<void> {
    try {
      // Only send notification for significant progress changes
      const previousPercentage = goal.progress.percentage;
      const newPercentage = progressData.percentage || previousPercentage;
      
      if (Math.abs(newPercentage - previousPercentage) >= 10) {
        await this.createNotification({
          userId: goal.contractorId,
          type: 'progress_update',
          title: 'Significant Progress Update',
          message: `Goal "${goal.title}" is now ${newPercentage}% complete`,
          data: { goalId: goal.id, progress: newPercentage },
          priority: 'medium',
        });
      }
    } catch (error) {
      logger.error('Failed to send progress update notification', error);
    }
  }

  /**
   * Send notification when a milestone is completed
   */
  async sendMilestoneCompletedNotification(goal: Goal, milestoneId: string): Promise<void> {
    try {
      const milestone = goal.milestones.find(m => m.id === milestoneId);
      if (!milestone) return;

      await this.createNotification({
        userId: goal.contractorId,
        type: 'milestone_completed',
        title: 'Milestone Completed! 🎉',
        message: `Milestone "${milestone.title}" for goal "${goal.title}" has been completed`,
        data: { goalId: goal.id, milestoneId },
        priority: 'high',
      });
    } catch (error) {
      logger.error('Failed to send milestone completed notification', error);
    }
  }

  /**
   * Send deadline reminder notifications
   */
  async sendDeadlineReminders(): Promise<void> {
    try {
      const now = new Date();
      const reminderDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      const { data: goals, error } = await supabase
        .from('contractor_goals')
        .select('*')
        .eq('status', 'active')
        .lte('timeframe->endDate', reminderDate.toISOString())
        .gte('timeframe->endDate', now.toISOString());

      if (error) throw error;

      for (const goal of goals || []) {
        await this.createNotification({
          userId: goal.contractorId,
          type: 'deadline_reminder',
          title: 'Deadline Approaching',
          message: `Goal "${goal.title}" deadline is approaching in 24 hours`,
          data: { goalId: goal.id },
          priority: 'high',
        });
      }
    } catch (error) {
      logger.error('Failed to send deadline reminders', error);
    }
  }

  /**
   * Send overdue goal notifications
   */
  async sendOverdueNotifications(): Promise<void> {
    try {
      const now = new Date();

      const { data: goals, error } = await supabase
        .from('contractor_goals')
        .select('*')
        .eq('status', 'active')
        .lt('timeframe->endDate', now.toISOString());

      if (error) throw error;

      for (const goal of goals || []) {
        // Update goal status to overdue
        await supabase
          .from('contractor_goals')
          .update({ status: 'overdue' })
          .eq('id', goal.id);

        await this.createNotification({
          userId: goal.contractorId,
          type: 'goal_overdue',
          title: 'Goal Overdue',
          message: `Goal "${goal.title}" is now overdue`,
          data: { goalId: goal.id },
          priority: 'critical',
        });
      }
    } catch (error) {
      logger.error('Failed to send overdue notifications', error);
    }
  }

  /**
   * Send blocker resolution notifications
   */
  async sendBlockerResolvedNotification(goal: Goal, blockerId: string): Promise<void> {
    try {
      const blocker = goal.progress.blockers.find(b => b.id === blockerId);
      if (!blocker) return;

      await this.createNotification({
        userId: goal.contractorId,
        type: 'blocker_resolved',
        title: 'Blocker Resolved',
        message: `Blocker "${blocker.title}" for goal "${goal.title}" has been resolved`,
        data: { goalId: goal.id, blockerId },
        priority: 'medium',
      });
    } catch (error) {
      logger.error('Failed to send blocker resolved notification', error);
    }
  }

  /**
   * Create a notification in the database
   */
  private async createNotification(notification: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  /**
   * Schedule recurring notifications (called by cron job)
   */
  async scheduleRecurringNotifications(): Promise<void> {
    try {
      await Promise.all([
        this.sendDeadlineReminders(),
        this.sendOverdueNotifications(),
      ]);
    } catch (error) {
      logger.error('Failed to schedule recurring notifications', error);
    }
  }
}
