import type {
  MilestoneNote,
  ProjectAnalytics,
  ProjectMilestone,
  ProjectProgress,
  ProjectTimeline,
  TimelineTemplate
} from '@mintenance/types';

import {
  addMilestoneNote,
  completeMilestone,
  createMilestone,
  createTimeline,
  createTimelineFromTemplate,
  getMilestoneNotes,
  getMilestones,
  getProjectAnalytics,
  getProjectProgress,
  getTimelineByJobId,
  getTimelineTemplates,
  updateMilestone,
  updateTimeline
} from './project-timeline';

type CreateTimelineParams = Parameters<typeof createTimeline>[0];
type UpdateTimelineParams = Parameters<typeof updateTimeline>[1];
type CreateMilestoneParams = Parameters<typeof createMilestone>[0];
type UpdateMilestoneParams = Parameters<typeof updateMilestone>[1];
type CreateTimelineFromTemplateParams = Parameters<typeof createTimelineFromTemplate>[0];

type AddMilestoneNoteParams = Parameters<typeof addMilestoneNote>[0];

export class ProjectTimelineService {
  static async createTimeline(data: CreateTimelineParams): Promise<ProjectTimeline> {
    return createTimeline(data);
  }

  static async getTimelineByJobId(jobId: string): Promise<ProjectTimeline | null> {
    return getTimelineByJobId(jobId);
  }

  static async updateTimeline(
    timelineId: string,
    updates: UpdateTimelineParams
  ): Promise<ProjectTimeline> {
    return updateTimeline(timelineId, updates);
  }

  static async createMilestone(data: CreateMilestoneParams): Promise<ProjectMilestone> {
    return createMilestone(data);
  }

  static async updateMilestone(
    milestoneId: string,
    updates: UpdateMilestoneParams
  ): Promise<ProjectMilestone> {
    return updateMilestone(milestoneId, updates);
  }

  static async getMilestones(timelineId: string): Promise<ProjectMilestone[]> {
    return getMilestones(timelineId);
  }

  static async completeMilestone(milestoneId: string, actualHours?: number): Promise<ProjectMilestone> {
    return completeMilestone(milestoneId, actualHours);
  }

  static async getProjectProgress(timelineId: string): Promise<ProjectProgress> {
    return getProjectProgress(timelineId);
  }

  static async addMilestoneNote(data: AddMilestoneNoteParams): Promise<MilestoneNote> {
    return addMilestoneNote(data);
  }

  static async getMilestoneNotes(
    milestoneId: string,
    userId: string,
    userRole: string
  ): Promise<MilestoneNote[]> {
    return getMilestoneNotes(milestoneId, userId, userRole);
  }

  static async getProjectAnalytics(timelineId: string): Promise<ProjectAnalytics> {
    return getProjectAnalytics(timelineId);
  }

  static async getTimelineTemplates(category?: string): Promise<TimelineTemplate[]> {
    return getTimelineTemplates(category);
  }

  static async createTimelineFromTemplate(
    data: CreateTimelineFromTemplateParams
  ): Promise<ProjectTimeline> {
    return createTimelineFromTemplate(data);
  }
}

export * from './project-timeline';
