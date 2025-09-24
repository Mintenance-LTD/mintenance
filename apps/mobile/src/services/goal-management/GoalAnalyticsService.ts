/**
 * GoalAnalyticsService
 * 
 * Handles analytics calculations, dashboard generation, and performance metrics
 * for goal management.
 */

import { supabase } from '../../config/supabase';
import { Goal, GoalAnalytics, GoalDashboard } from './types';

export class GoalAnalyticsService {
  /**
   * Initialize analytics tracking for a new goal
   */
  async initializeGoalAnalytics(goalId: string): Promise<void> {
    const analyticsData: GoalAnalytics = {
      goalId,
      period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      },
      metrics: {
        completionRate: 0,
        averageVelocity: 0,
        timeToComplete: 0,
        accuracy: 0,
      },
      trends: {
        progress: [0],
        velocity: [0],
        kpis: {},
      },
      insights: [],
      recommendations: [],
      lastCalculated: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('goal_analytics')
      .insert(analyticsData);

    if (error) throw error;
  }

  /**
   * Update analytics for a goal
   */
  async updateGoalAnalytics(goalId: string): Promise<void> {
    const goal = await this.getGoalById(goalId);
    const analytics = await this.calculateGoalAnalytics(goal);

    const { error } = await supabase
      .from('goal_analytics')
      .update({
        ...analytics,
        lastCalculated: new Date().toISOString(),
      })
      .eq('goal_id', goalId);

    if (error) throw error;
  }

  /**
   * Get analytics for a specific goal
   */
  async getGoalAnalytics(goalId: string): Promise<GoalAnalytics> {
    const { data, error } = await supabase
      .from('goal_analytics')
      .select('*')
      .eq('goal_id', goalId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Generate dashboard for a contractor
   */
  async generateDashboard(contractorId: string, goals: Goal[]): Promise<GoalDashboard> {
    const summary = this.calculateSummary(goals);
    const recentActivity = await this.getRecentActivity(contractorId);
    const upcomingMilestones = this.getUpcomingMilestones(goals);
    const topPerformers = this.getTopPerformers(goals);
    const needsAttention = this.getGoalsNeedingAttention(goals);

    return {
      contractorId,
      summary,
      recentActivity,
      upcomingMilestones,
      topPerformers,
      needsAttention,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Delete analytics data for a goal
   */
  async deleteGoalAnalytics(goalId: string): Promise<void> {
    const { error } = await supabase
      .from('goal_analytics')
      .delete()
      .eq('goal_id', goalId);

    if (error) throw error;
  }

  /**
   * Calculate analytics for a goal
   */
  private async calculateGoalAnalytics(goal: Goal): Promise<GoalAnalytics> {
    const now = new Date();
    const startDate = new Date(goal.timeframe.startDate);
    const endDate = new Date(goal.timeframe.endDate);
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const completionRate = goal.progress.percentage;
    const averageVelocity = elapsedDays > 0 ? completionRate / elapsedDays : 0;
    const timeToComplete = completionRate > 0 ? (100 - completionRate) / averageVelocity : totalDays;
    const accuracy = goal.metrics.currentValue / goal.metrics.targetValue;

    const insights = this.generateInsights(goal, {
      completionRate,
      averageVelocity,
      timeToComplete,
      accuracy,
    });

    const recommendations = this.generateRecommendations(goal, {
      completionRate,
      averageVelocity,
      timeToComplete,
      accuracy,
    });

    return {
      goalId: goal.id,
      period: {
        start: goal.timeframe.startDate,
        end: goal.timeframe.endDate,
      },
      metrics: {
        completionRate,
        averageVelocity,
        timeToComplete,
        accuracy,
      },
      trends: {
        progress: goal.progress.updates.map(update => 
          update.metrics?.currentValue || 0
        ),
        velocity: [averageVelocity],
        kpis: this.extractKPITrends(goal),
      },
      insights,
      recommendations,
      lastCalculated: new Date().toISOString(),
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(goals: Goal[]) {
    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.status === 'active').length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const overdueGoals = goals.filter(g => g.status === 'overdue').length;
    const averageProgress = goals.length > 0 
      ? goals.reduce((sum, g) => sum + g.progress.percentage, 0) / goals.length 
      : 0;

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      overdueGoals,
      averageProgress,
    };
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(contractorId: string) {
    const { data, error } = await supabase
      .from('contractor_goals')
      .select('progress')
      .eq('contractor_id', contractorId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data?.flatMap(goal => goal.progress.updates) || [];
  }

  /**
   * Get upcoming milestones
   */
  private getUpcomingMilestones(goals: Goal[]) {
    const now = new Date();
    const upcomingMilestones = goals
      .flatMap(goal => goal.milestones.map(milestone => ({ ...milestone, goalId: goal.id })))
      .filter(milestone => 
        milestone.status === 'pending' && 
        new Date(milestone.targetDate) > now
      )
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      .slice(0, 5);

    return upcomingMilestones;
  }

  /**
   * Get top performing goals
   */
  private getTopPerformers(goals: Goal[]) {
    return goals
      .filter(goal => goal.status === 'active')
      .sort((a, b) => b.progress.percentage - a.progress.percentage)
      .slice(0, 3);
  }

  /**
   * Get goals needing attention
   */
  private getGoalsNeedingAttention(goals: Goal[]) {
    return goals.filter(goal => 
      goal.status === 'active' && 
      (goal.progress.status === 'behind' || goal.progress.status === 'at_risk')
    );
  }

  /**
   * Generate insights
   */
  private generateInsights(goal: Goal, metrics: any): string[] {
    const insights: string[] = [];

    if (metrics.completionRate > 80) {
      insights.push('Goal is on track for completion');
    } else if (metrics.completionRate < 30) {
      insights.push('Goal may need additional attention');
    }

    if (metrics.averageVelocity > 1) {
      insights.push('Progress velocity is above average');
    } else if (metrics.averageVelocity < 0.5) {
      insights.push('Progress velocity is below average');
    }

    if (goal.progress.blockers.length > 0) {
      insights.push(`${goal.progress.blockers.length} active blockers identified`);
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(goal: Goal, metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.completionRate < 30) {
      recommendations.push('Consider breaking down into smaller milestones');
    }

    if (goal.progress.blockers.length > 0) {
      recommendations.push('Address active blockers to improve progress');
    }

    if (metrics.averageVelocity < 0.5) {
      recommendations.push('Review resource allocation and timeline');
    }

    return recommendations;
  }

  /**
   * Extract KPI trends
   */
  private extractKPITrends(goal: Goal): Record<string, number[]> {
    const trends: Record<string, number[]> = {};
    
    goal.metrics.kpis.forEach(kpi => {
      trends[kpi.name] = [kpi.value];
    });

    return trends;
  }

  /**
   * Helper method to get goal by ID
   */
  private async getGoalById(goalId: string): Promise<Goal> {
    const { data, error } = await supabase
      .from('contractor_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (error) throw error;
    return data;
  }
}
