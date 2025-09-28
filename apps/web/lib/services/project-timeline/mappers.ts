import type {
  MilestoneNote,
  MilestoneTemplate as DomainMilestoneTemplate,
  ProjectMilestone,
  ProjectTimeline,
  TimelineTemplate
} from '@mintenance/types';

import type {
  MilestoneNoteRow,
  MilestoneTemplateRow,
  ProjectMilestoneRow,
  ProjectTimelineRow,
  TimelineTemplateRow
} from './types';

export function mapTimelineFromRow(timeline: ProjectTimelineRow): ProjectTimeline {
  const milestoneRows = timeline.project_milestones ?? undefined;
  const milestones = milestoneRows?.map(mapMilestoneFromRow);
  const totalMilestones = milestoneRows?.length;
  const completedMilestones = milestoneRows
    ? milestoneRows.filter(milestone => milestone.status === 'completed').length
    : undefined;

  return {
    id: timeline.id,
    jobId: timeline.job_id,
    title: timeline.title,
    description: timeline.description ?? undefined,
    startDate: timeline.start_date,
    estimatedEndDate: timeline.estimated_end_date,
    actualEndDate: timeline.actual_end_date ?? undefined,
    status: timeline.status,
    progress: timeline.progress,
    priority: timeline.priority,
    createdBy: timeline.created_by,
    createdAt: timeline.created_at,
    updatedAt: timeline.updated_at,
    job: timeline.jobs ?? undefined,
    milestones,
    totalMilestones,
    completedMilestones
  };
}

export function mapMilestoneFromRow(milestone: ProjectMilestoneRow): ProjectMilestone {
  return {
    id: milestone.id,
    timelineId: milestone.timeline_id,
    jobId: milestone.job_id,
    title: milestone.title,
    description: milestone.description ?? undefined,
    targetDate: milestone.target_date,
    completedDate: milestone.completed_date ?? undefined,
    status: milestone.status,
    priority: milestone.priority,
    type: milestone.type,
    assignedTo: milestone.assigned_to ?? undefined,
    estimatedHours: milestone.estimated_hours ?? undefined,
    actualHours: milestone.actual_hours ?? undefined,
    paymentAmount: milestone.payment_amount ?? undefined,
    dependencies: milestone.dependencies ?? undefined,
    createdBy: milestone.created_by,
    createdAt: milestone.created_at,
    updatedAt: milestone.updated_at,
    assignee: milestone.users ? {
      id: milestone.users.id,
      email: (milestone.users as any).email || '',
      first_name: milestone.users.first_name,
      last_name: milestone.users.last_name,
      role: (milestone.users as any).role || 'contractor',
      created_at: (milestone.users as any).created_at || new Date().toISOString(),
      updated_at: (milestone.users as any).updated_at || new Date().toISOString()
    } : undefined
  };
}

export function mapNoteFromRow(note: MilestoneNoteRow): MilestoneNote {
  return {
    id: note.id,
    milestoneId: note.milestone_id,
    content: note.content,
    type: note.type,
    visibility: note.visibility,
    authorId: note.author_id,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    author: note.users ? {
      id: note.users.id,
      email: (note.users as any).email || '',
      first_name: note.users.first_name,
      last_name: note.users.last_name,
      role: (note.users as any).role || 'contractor',
      created_at: (note.users as any).created_at || new Date().toISOString(),
      updated_at: (note.users as any).updated_at || new Date().toISOString()
    } : undefined
  };
}

export function mapTemplateFromRow(template: TimelineTemplateRow): TimelineTemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.description as string,
    category: template.category,
    estimatedDuration: template.estimated_duration,
    milestoneTemplates: (template.milestone_templates ?? []).map(mapMilestoneTemplateFromRow),
    createdBy: template.created_by,
    isPublic: template.is_public,
    usageCount: template.usage_count ?? 0,
    rating: template.rating ?? 0,
    createdAt: template.created_at,
    updatedAt: template.updated_at
  };
}

export function mapMilestoneTemplateFromRow(template: MilestoneTemplateRow): DomainMilestoneTemplate {
  return {
    id: template.id,
    templateId: template.template_id,
    title: template.title,
    description: template.description ?? undefined,
    type: template.type,
    priority: template.priority,
    dayOffset: template.day_offset,
    estimatedHours: template.estimated_hours ?? undefined,
    paymentPercentage: template.payment_percentage ?? undefined,
    dependencies: template.dependencies ?? undefined,
    isRequired: template.is_required,
    order: template.order
  };
}
