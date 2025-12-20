import { supabase } from '@/lib/supabase';
import type { ProjectTimeline } from '@mintenance/types';

import { mapTimelineFromRow } from './mappers';
import type { ProjectTimelineRow } from './types';

type CreateTimelineParams = {
  jobId: string;
  title: string;
  description?: string;
  startDate: string;
  estimatedEndDate: string;
  priority: ProjectTimeline['priority'];
  createdBy: string;
};

type UpdateTimelineParams = Partial<Pick<ProjectTimeline, 'title' | 'description' | 'estimatedEndDate' | 'status' | 'priority'>>;

export async function createTimeline(data: CreateTimelineParams): Promise<ProjectTimeline> {
  const timelineData = {
    job_id: data.jobId,
    title: data.title,
    description: data.description ?? null,
    start_date: data.startDate,
    estimated_end_date: data.estimatedEndDate,
    priority: data.priority,
    created_by: data.createdBy,
    status: 'planning' as const,
    progress: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: timeline, error } = await supabase
    .from('project_timelines')
    .insert([timelineData])
    .select('*')
    .returns<ProjectTimelineRow>()
    .single();

  if (error) throw error;
  if (!timeline) throw new Error('Timeline response missing from Supabase');

  return mapTimelineFromRow(timeline);
}

export async function getTimelineByJobId(jobId: string): Promise<ProjectTimeline | null> {
  const { data: timeline, error } = await supabase
    .from('project_timelines')
    .select(`
      *,
      jobs!inner(*),
      project_milestones(*)
    `)
    .eq('job_id', jobId)
    .returns<ProjectTimelineRow>()
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!timeline) return null;

  return mapTimelineFromRow(timeline);
}

export async function updateTimeline(
  timelineId: string,
  updates: UpdateTimelineParams
): Promise<ProjectTimeline> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (typeof updates.title !== 'undefined') {
    updateData.title = updates.title;
  }
  if (typeof updates.description !== 'undefined') {
    updateData.description = updates.description ?? null;
  }
  if (typeof updates.estimatedEndDate !== 'undefined') {
    updateData.estimated_end_date = updates.estimatedEndDate;
  }
  if (typeof updates.status !== 'undefined') {
    updateData.status = updates.status;
  }
  if (typeof updates.priority !== 'undefined') {
    updateData.priority = updates.priority;
  }

  const { data: timeline, error } = await supabase
    .from('project_timelines')
    .update(updateData)
    .eq('id', timelineId)
    .select(`
      *,
      jobs!inner(*),
      project_milestones(*)
    `)
    .returns<ProjectTimelineRow>()
    .single();

  if (error) throw error;
  if (!timeline) throw new Error('Timeline update returned no rows');

  return mapTimelineFromRow(timeline);
}
