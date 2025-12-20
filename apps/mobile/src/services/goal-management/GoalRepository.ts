/**
 * GoalRepository
 * 
 * Handles all database operations for goals, milestones, and related data.
 */

import { supabase } from '../../config/supabase';
import {
  Goal,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalFilters,
  GoalSortOptions,
  GoalSearchParams,
  GoalTemplate,
} from './types';

export class GoalRepository {
  /**
   * Create a new goal in the database
   */
  async createGoal(request: CreateGoalRequest): Promise<Goal> {
    const { data, error } = await supabase
      .from('contractor_goals')
      .insert({
        contractor_id: request.contractorId,
        category: request.category,
        type: request.type,
        title: request.title,
        description: request.description,
        priority: request.priority,
        status: 'draft',
        timeframe: request.timeframe,
        metrics: request.metrics,
        milestones: request.milestones || [],
        dependencies: request.dependencies || [],
        assignees: request.assignees || [],
        tags: request.tags || [],
        notes: [],
        attachments: [],
        progress: {
          percentage: 0,
          status: 'on_track',
          lastUpdated: new Date().toISOString(),
          velocity: 0,
          estimatedCompletion: request.timeframe.endDate,
          blockers: [],
          achievements: [],
          updates: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get goals for a contractor with filtering and sorting
   */
  async getGoals(
    contractorId: string,
    params?: GoalSearchParams
  ): Promise<{ goals: Goal[]; total: number }> {
    let query = supabase
      .from('contractor_goals')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId);

    // Apply filters
    if (params?.filters) {
      const filters = params.filters;
      
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      
      if (filters.type?.length) {
        query = query.in('type', filters.type);
      }
      
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      
      if (filters.tags?.length) {
        query = query.overlaps('tags', filters.tags);
      }
      
      if (filters.assignees?.length) {
        query = query.overlaps('assignees', filters.assignees);
      }
      
      if (filters.dateRange) {
        query = query
          .gte('timeframe->startDate', filters.dateRange.start)
          .lte('timeframe->endDate', filters.dateRange.end);
      }
      
      if (filters.progressRange) {
        query = query
          .gte('progress->percentage', filters.progressRange.min)
          .lte('progress->percentage', filters.progressRange.max);
      }
    }

    // Apply search query
    if (params?.query) {
      query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }

    // Apply sorting
    if (params?.sort) {
      const { field, direction } = params.sort;
      query = query.order(field, { ascending: direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      goals: data || [],
      total: count || 0,
    };
  }

  /**
   * Get a specific goal by ID
   */
  async getGoalById(goalId: string): Promise<Goal> {
    const { data, error } = await supabase
      .from('contractor_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing goal
   */
  async updateGoal(request: UpdateGoalRequest): Promise<Goal> {
    const updateData = {
      ...request.updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contractor_goals')
      .update(updateData)
      .eq('id', request.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    const { error } = await supabase
      .from('contractor_goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
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
    // Get current goal
    const currentGoal = await this.getGoalById(goalId);

    // Update progress data
    const updatedProgress = {
      ...currentGoal.progress,
      percentage: progressData.percentage ?? currentGoal.progress.percentage,
      lastUpdated: new Date().toISOString(),
    };

    // Update metrics if currentValue provided
    let updatedMetrics = currentGoal.metrics;
    if (progressData.currentValue !== undefined) {
      updatedMetrics = {
        ...currentGoal.metrics,
        currentValue: progressData.currentValue,
      };
    }

    // Add progress update
    const progressUpdate = {
      id: `update_${Date.now()}`,
      goalId,
      userId: currentGoal.contractorId,
      content: progressData.notes || 'Progress updated',
      type: 'manual' as const,
      metrics: progressData.currentValue ? { currentValue: progressData.currentValue } : undefined,
      attachments: progressData.attachments || [],
      createdAt: new Date().toISOString(),
    };

    updatedProgress.updates = [...currentGoal.progress.updates, progressUpdate];

    const { data, error } = await supabase
      .from('contractor_goals')
      .update({
        progress: updatedProgress,
        metrics: updatedMetrics,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    const currentGoal = await this.getGoalById(goalId);

    const updatedMilestones = currentGoal.milestones.map(milestone => {
      if (milestone.id === milestoneId) {
        return {
          ...milestone,
          status: 'completed' as const,
          completedDate: new Date().toISOString(),
        };
      }
      return milestone;
    });

    const { data, error } = await supabase
      .from('contractor_goals')
      .update({
        milestones: updatedMilestones,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Archive completed goals
   */
  async archiveCompletedGoals(contractorId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contractor_goals')
      .update({ status: 'archived' })
      .eq('contractor_id', contractorId)
      .eq('status', 'completed')
      .select();

    if (error) throw error;
    return data?.length || 0;
  }

  /**
   * Get goal templates
   */
  async getGoalTemplates(category?: string): Promise<GoalTemplate[]> {
    let query = supabase
      .from('goal_templates')
      .select('*')
      .eq('is_public', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a specific goal template
   */
  async getGoalTemplate(templateId: string): Promise<GoalTemplate> {
    const { data, error } = await supabase
      .from('goal_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Increment template usage count
   */
  async incrementTemplateUsage(templateId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });

    if (error) throw error;
  }
}
