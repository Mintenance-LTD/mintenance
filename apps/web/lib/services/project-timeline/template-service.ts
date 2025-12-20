import { supabase } from '@/lib/supabase';
import type { ProjectTimeline, TimelineTemplate } from '@mintenance/types';

import { createMilestone } from './milestone-service';
import { createTimeline } from './timeline-service';
import { mapTemplateFromRow, mapMilestoneTemplateFromRow } from './mappers';
import type { MilestoneTemplateRow, TimelineTemplateRow } from './types';

type CreateTimelineFromTemplateParams = {
  templateId: string;
  jobId: string;
  startDate: string;
  createdBy: string;
  customizations?: {
    title?: string;
    description?: string;
    adjustDays?: number;
  };
};

export async function getTimelineTemplates(category?: string): Promise<TimelineTemplate[]> {
  // Start base query without generics to keep chainable methods available
  let query = supabase
    .from('timeline_templates')
    .select('*')
    .eq('is_public', true);

  if (category) {
    query = query.eq('category', category);
  }

  const { data: templates, error } = await query.order('usage_count', { ascending: false }).returns<TimelineTemplateRow[]>();

  if (error) throw error;

  return (templates ?? []).map(mapTemplateFromRow);
}

export async function createTimelineFromTemplate(data: CreateTimelineFromTemplateParams): Promise<ProjectTimeline> {
  const { data: template, error: templateError } = await supabase
    .from('timeline_templates')
    .select(`
      *,
      milestone_templates(*)
    `)
    .eq('id', data.templateId)
    .single<TimelineTemplateRow>();

  if (templateError) throw templateError;
  if (!template) {
    throw new Error('Timeline template not found');
  }

  const startDate = new Date(data.startDate);
  const durationAdjustment = data.customizations?.adjustDays ?? 0;
  const estimatedEndDate = new Date(startDate);
  estimatedEndDate.setDate(startDate.getDate() + template.estimated_duration + durationAdjustment);

  const timeline = await createTimeline({
    jobId: data.jobId,
    title: data.customizations?.title ?? template.name,
    description: data.customizations?.description ?? template.description ?? undefined,
    startDate: data.startDate,
    estimatedEndDate: estimatedEndDate.toISOString(),
    priority: 'medium',
    createdBy: data.createdBy
  });

  const milestoneTemplates: MilestoneTemplateRow[] = template.milestone_templates ?? [];
  for (const milestoneTemplate of milestoneTemplates) {
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + milestoneTemplate.day_offset + durationAdjustment);

    await createMilestone({
      timelineId: timeline.id,
      jobId: data.jobId,
      title: milestoneTemplate.title,
      description: milestoneTemplate.description ?? undefined,
      targetDate: targetDate.toISOString(),
      priority: milestoneTemplate.priority,
      type: milestoneTemplate.type,
      estimatedHours: milestoneTemplate.estimated_hours ?? undefined,
      createdBy: data.createdBy
    });
  }

  return timeline;
}
