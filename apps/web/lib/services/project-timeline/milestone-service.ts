import { supabase } from '@/lib/supabase';
import type { ProjectMilestone, MilestoneNote } from '@mintenance/types';

import { getProjectProgress } from './analytics-service';
import { mapMilestoneFromRow, mapNoteFromRow } from './mappers';
import type { MilestoneNoteRow, ProjectMilestoneRow } from './types';

type CreateMilestoneParams = {
  timelineId: string;
  jobId: string;
  title: string;
  description?: string;
  targetDate: string;
  priority: ProjectMilestone['priority'];
  type: ProjectMilestone['type'];
  assignedTo?: string;
  estimatedHours?: number;
  paymentAmount?: number;
  dependencies?: string[];
  createdBy: string;
};

type UpdateMilestoneParams = Partial<Pick<ProjectMilestone, 'title' | 'description' | 'targetDate' | 'status' | 'priority' | 'actualHours' | 'completedDate'>>;

export async function createMilestone(data: CreateMilestoneParams): Promise<ProjectMilestone> {
  const milestoneData = {
    timeline_id: data.timelineId,
    job_id: data.jobId,
    title: data.title,
    description: data.description ?? null,
    target_date: data.targetDate,
    priority: data.priority,
    type: data.type,
    assigned_to: data.assignedTo ?? null,
    estimated_hours: data.estimatedHours ?? null,
    payment_amount: data.paymentAmount ?? null,
    dependencies: data.dependencies ?? null,
    created_by: data.createdBy,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: milestone, error } = await supabase
    .from('project_milestones')
    .insert([milestoneData])
    .select('*')
    .returns<ProjectMilestoneRow>()
    .single();

  if (error) throw error;
  if (!milestone) throw new Error('Milestone creation returned no rows');

  await updateTimelineProgressInternal(data.timelineId);

  return mapMilestoneFromRow(milestone);
}

export async function updateMilestone(
  milestoneId: string,
  updates: UpdateMilestoneParams
): Promise<ProjectMilestone> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (typeof updates.title !== 'undefined') {
    updateData.title = updates.title;
  }
  if (typeof updates.description !== 'undefined') {
    updateData.description = updates.description ?? null;
  }
  if (typeof updates.targetDate !== 'undefined') {
    updateData.target_date = updates.targetDate;
  }
  if (typeof updates.status !== 'undefined') {
    updateData.status = updates.status;
  }
  if (typeof updates.actualHours !== 'undefined') {
    updateData.actual_hours = updates.actualHours ?? null;
  }
  if (typeof updates.completedDate !== 'undefined') {
    updateData.completed_date = updates.completedDate ?? null;
  }

  const { data: milestone, error } = await supabase
    .from('project_milestones')
    .update(updateData)
    .eq('id', milestoneId)
    .select('*')
    .single<ProjectMilestoneRow>();

  if (error) throw error;
  if (!milestone) throw new Error('Milestone update returned no rows');

  if (updates.status === 'completed') {
    await updateTimelineProgressInternal(milestone.timeline_id);
  }

  return mapMilestoneFromRow(milestone);
}

export async function getMilestones(timelineId: string): Promise<ProjectMilestone[]> {
  const { data: milestones, error } = await supabase
    .from('project_milestones')
    .select(`
      *,
      users!project_milestones_assigned_to_fkey(id, first_name, last_name, email)
    `)
    .eq('timeline_id', timelineId)
    .order('target_date', { ascending: true })
    .returns<ProjectMilestoneRow[]>();

  if (error) throw error;

  return (milestones ?? []).map(mapMilestoneFromRow);
}

export async function completeMilestone(milestoneId: string, actualHours?: number): Promise<ProjectMilestone> {
  const completedDate = new Date().toISOString();

  return updateMilestone(milestoneId, {
    status: 'completed',
    completedDate,
    actualHours
  });
}

export async function addMilestoneNote(data: {
  milestoneId: string;
  content: string;
  type: MilestoneNote['type'];
  visibility: MilestoneNote['visibility'];
  authorId: string;
}): Promise<MilestoneNote> {
  const noteData = {
    milestone_id: data.milestoneId,
    content: data.content,
    type: data.type,
    visibility: data.visibility,
    author_id: data.authorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: note, error } = await supabase
    .from('milestone_notes')
    .insert([noteData])
    .select(`
      *,
      users!milestone_notes_author_id_fkey(id, first_name, last_name)
    `)
    .returns<MilestoneNoteRow>()
    .single();

  if (error) throw error;
  if (!note) throw new Error('Milestone note creation returned no rows');

  return mapNoteFromRow(note);
}

export async function getMilestoneNotes(
  milestoneId: string,
  _userId: string,
  userRole: string
): Promise<MilestoneNote[]> {
  let query = supabase
    .from('milestone_notes')
    .select(`
      *,
      users!milestone_notes_author_id_fkey(id, first_name, last_name)
    `)
    .eq('milestone_id', milestoneId)
    ;

  if (userRole === 'contractor') {
    query = query.in('visibility', ['public', 'contractor_only']);
  } else if (userRole === 'homeowner') {
    query = query.in('visibility', ['public', 'homeowner_only']);
  }

  const { data: notes, error } = await query.order('created_at', { ascending: true }).returns<MilestoneNoteRow[]>();

  if (error) throw error;

  return (notes ?? []).map(mapNoteFromRow);
}

async function updateTimelineProgressInternal(timelineId: string): Promise<void> {
  try {
    const progress = await getProjectProgress(timelineId);

    await supabase
      .from('project_timelines')
      .update({
        progress: progress.progressPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', timelineId);
  } catch (error) {
    console.error('Failed to update timeline progress:', error);
  }
}
