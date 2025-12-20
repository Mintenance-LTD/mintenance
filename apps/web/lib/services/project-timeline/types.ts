import type {
  Job,
  MilestoneNote,
  MilestoneTemplate as DomainMilestoneTemplate,
  ProjectMilestone,
  ProjectTimeline,
  TimelineTemplate,
  User
} from '@mintenance/types';

export type ProjectMilestoneAssignee = Pick<User, 'id' | 'first_name' | 'last_name'> & { email?: string };

export type MilestoneNoteAuthor = Pick<User, 'id' | 'first_name' | 'last_name'> & { email?: string };

export type ProjectMilestoneRow = {
  id: string;
  timeline_id: string;
  job_id: string;
  title: string;
  description: string | null;
  target_date: string;
  completed_date: string | null;
  status: ProjectMilestone['status'];
  priority: ProjectMilestone['priority'];
  type: ProjectMilestone['type'];
  assigned_to: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  payment_amount: number | null;
  dependencies: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  users?: ProjectMilestoneAssignee | null;
};

export type MilestoneNoteRow = {
  id: string;
  milestone_id: string;
  content: string;
  type: MilestoneNote['type'];
  visibility: MilestoneNote['visibility'];
  author_id: string;
  created_at: string;
  updated_at: string;
  users?: MilestoneNoteAuthor | null;
};

export type MilestoneTemplateRow = {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  type: ProjectMilestone['type'];
  priority: ProjectMilestone['priority'];
  day_offset: number;
  estimated_hours: number | null;
  payment_percentage: number | null;
  dependencies: number[] | null;
  is_required: boolean;
  order: number;
  created_at: string;
  updated_at: string;
};

export type TimelineTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  estimated_duration: number;
  created_by: string;
  is_public: boolean;
  usage_count: number | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  milestone_templates?: MilestoneTemplateRow[] | null;
};

export type ProjectTimelineRow = {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  start_date: string;
  estimated_end_date: string;
  actual_end_date: string | null;
  status: ProjectTimeline['status'];
  progress: number;
  priority: ProjectTimeline['priority'];
  created_by: string;
  created_at: string;
  updated_at: string;
  jobs?: Job | null;
  project_milestones?: ProjectMilestoneRow[] | null;
};

export type ProgressMilestoneRow = {
  status: ProjectMilestone['status'];
  target_date: string | null;
  completed_date: string | null;
};
