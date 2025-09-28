import { supabase } from '@/lib/supabase';
import type { ProjectAnalytics, ProjectBottleneck, ProjectProgress } from '@mintenance/types';

import { mapMilestoneFromRow } from './mappers';
import type { ProgressMilestoneRow, ProjectMilestoneRow, ProjectTimelineRow } from './types';

export async function getProjectProgress(timelineId: string): Promise<ProjectProgress> {
  const { data: milestones, error } = await supabase
    .from('project_milestones')
    .select('status, target_date, completed_date')
    .eq('timeline_id', timelineId)
    .returns<ProgressMilestoneRow[]>();

  if (error) throw error;

  const milestoneRows = milestones ?? [];
  const now = new Date();
  const totalMilestones = milestoneRows.length;
  const completedMilestones = milestoneRows.filter((m: ProgressMilestoneRow) => m.status === 'completed').length;
  const overdueMilestones = milestoneRows.filter((m: ProgressMilestoneRow) =>
    m.status !== 'completed' && m.target_date && new Date(m.target_date) < now
  ).length;
  const upcomingMilestones = milestoneRows.filter((m: ProgressMilestoneRow) =>
    m.status === 'pending' && m.target_date && new Date(m.target_date) > now
  ).length;

  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const { data: timeline } = await supabase
    .from('project_timelines')
    .select('estimated_end_date')
    .eq('id', timelineId)
    .single();

  const estimatedEndDate = timeline?.estimated_end_date ?? null;
  const endDate = estimatedEndDate ? new Date(estimatedEndDate) : null;

  let daysRemaining: number | undefined;
  let daysOverdue: number | undefined;
  let isOnTrack = true;

  if (endDate) {
    const timeDiff = endDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff > 0) {
      daysRemaining = daysDiff;
    } else {
      daysOverdue = Math.abs(daysDiff);
      isOnTrack = false;
    }
  }

  let estimatedCompletion = estimatedEndDate ?? now.toISOString();
  if (progressPercentage > 0 && progressPercentage < 100 && endDate) {
    const totalDuration = endDate.getTime() - now.getTime();
    const remainingWork = (100 - progressPercentage) / 100;
    const estimatedRemaining = totalDuration * remainingWork;
    estimatedCompletion = new Date(now.getTime() + estimatedRemaining).toISOString();
  }

  return {
    timelineId,
    totalMilestones,
    completedMilestones,
    overdueMilestones,
    upcomingMilestones,
    progressPercentage,
    estimatedCompletion,
    isOnTrack,
    daysRemaining,
    daysOverdue
  };
}

export async function getProjectAnalytics(timelineId: string): Promise<ProjectAnalytics> {
  const [timeline, milestones, progress] = await Promise.all([
    supabase.from('project_timelines').select('*').eq('id', timelineId).single<ProjectTimelineRow>(),
    supabase.from('project_milestones').select('*').eq('timeline_id', timelineId).returns<ProjectMilestoneRow[]>(),
    getProjectProgress(timelineId)
  ]);

  if (timeline.error) throw timeline.error;
  if (milestones.error) throw milestones.error;

  const timelineData = timeline.data;
  if (!timelineData) {
    throw new Error('Timeline analytics data not found');
  }

  const milestoneRows = milestones.data ?? [];

  const startDate = new Date(timelineData.start_date);
  const endDate = timelineData.actual_end_date ? new Date(timelineData.actual_end_date) : new Date();
  const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

  const estimatedEndDate = new Date(timelineData.estimated_end_date);
  const estimatedDuration = Math.ceil((estimatedEndDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

  const onTime = milestoneRows.filter((m: ProjectMilestoneRow) =>
    m.status === 'completed' &&
    m.completed_date &&
    new Date(m.completed_date) <= new Date(m.target_date)
  ).length;

  const late = milestoneRows.filter((m: ProjectMilestoneRow) =>
    m.status === 'completed' &&
    m.completed_date &&
    new Date(m.completed_date) > new Date(m.target_date)
  ).length;

  const early = milestoneRows.filter((m: ProjectMilestoneRow) =>
    m.status === 'completed' &&
    m.completed_date &&
    new Date(m.completed_date) < new Date(m.target_date)
  ).length;

  const cancelled = milestoneRows.filter((m: ProjectMilestoneRow) => m.status === 'cancelled').length;

  const totalBudget = 10000;
  const milestonePayments = milestoneRows
    .filter((m: ProjectMilestoneRow) => m.status === 'completed' && m.payment_amount)
    .reduce((sum: number, m: ProjectMilestoneRow) => sum + (m.payment_amount ?? 0), 0);

  const bottlenecks: ProjectBottleneck[] = milestoneRows
    .filter((m: ProjectMilestoneRow): m is ProjectMilestoneRow & { completed_date: string } => {
      if (m.status === 'completed' && m.completed_date) {
        const delay = new Date(m.completed_date).getTime() - new Date(m.target_date).getTime();
        return delay > (2 * 24 * 60 * 60 * 1000);
      }
      return false;
    })
    .map((m: ProjectMilestoneRow & { completed_date: string }) => {
      const delayDays = Math.ceil(
        (new Date(m.completed_date).getTime() - new Date(m.target_date).getTime()) / (1000 * 3600 * 24)
      );

      return {
        milestoneId: m.id,
        milestoneName: m.title,
        delayDays,
        impact: delayDays > 7 ? 'high' : delayDays > 3 ? 'medium' : 'low',
        reason: 'Task complexity exceeded estimates',
        suggestedAction: 'Break down complex tasks into smaller milestones'
      };
    });

  const recommendations: string[] = [];
  if (progress.overdueMilestones > 0) {
    recommendations.push('Focus on completing overdue milestones to get back on track');
  }
  if (progress.progressPercentage < 50 && progress.daysRemaining && progress.daysRemaining < 30) {
    recommendations.push('Consider adding resources or extending timeline');
  }
  if (bottlenecks.length > 2) {
    recommendations.push('Implement better task estimation and buffer time');
  }

  return {
    timelineId,
    totalDuration,
    estimatedVsActualTime: {
      estimated: estimatedDuration,
      actual: totalDuration,
      variance: estimatedDuration === 0 ? 0 : ((totalDuration - estimatedDuration) / estimatedDuration) * 100
    },
    milestonePerformance: {
      onTime,
      late,
      early,
      cancelled
    },
    budgetTracking: {
      totalBudget,
      spentAmount: milestonePayments,
      remainingAmount: totalBudget - milestonePayments,
      milestonePayments,
      pendingPayments: milestoneRows
        .filter((m: ProjectMilestoneRow) => m.status === 'completed' && !m.payment_amount)
        .length * 1000
    },
    bottlenecks,
    recommendations
  };
}
