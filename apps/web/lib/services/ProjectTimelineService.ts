import { supabase } from '@/lib/supabase';
import type {
  ProjectTimeline,
  ProjectMilestone,
  ProjectProgress,
  TimelineTemplate,
  MilestoneTemplate,
  ProjectAnalytics,
  ProjectBottleneck,
  MilestoneNote,
  MilestoneAttachment
} from '@mintenance/types';

export class ProjectTimelineService {
  /**
   * Create a new project timeline
   */
  static async createTimeline(data: {
    jobId: string;
    title: string;
    description?: string;
    startDate: string;
    estimatedEndDate: string;
    priority: ProjectTimeline['priority'];
    createdBy: string;
  }): Promise<ProjectTimeline> {
    try {
      const timelineData = {
        ...data,
        status: 'planning' as const,
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: timeline, error } = await supabase
        .from('project_timelines')
        .insert([timelineData])
        .select('*')
        .single();

      if (error) throw error;

      return this.mapTimelineFromDb(timeline);
    } catch (error) {
      console.error('Failed to create timeline:', error);
      throw new Error('Failed to create project timeline');
    }
  }

  /**
   * Get timeline for a job
   */
  static async getTimelineByJobId(jobId: string): Promise<ProjectTimeline | null> {
    try {
      const { data: timeline, error } = await supabase
        .from('project_timelines')
        .select(`
          *,
          jobs!inner(*),
          project_milestones(*)
        `)
        .eq('job_id', jobId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!timeline) return null;

      return this.mapTimelineFromDb(timeline);
    } catch (error) {
      console.error('Failed to get timeline:', error);
      throw new Error('Failed to retrieve project timeline');
    }
  }

  /**
   * Update timeline
   */
  static async updateTimeline(
    timelineId: string,
    updates: Partial<Pick<ProjectTimeline, 'title' | 'description' | 'estimatedEndDate' | 'status' | 'priority'>>
  ): Promise<ProjectTimeline> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: timeline, error } = await supabase
        .from('project_timelines')
        .update(updateData)
        .eq('id', timelineId)
        .select(`
          *,
          jobs!inner(*),
          project_milestones(*)
        `)
        .single();

      if (error) throw error;

      return this.mapTimelineFromDb(timeline);
    } catch (error) {
      console.error('Failed to update timeline:', error);
      throw new Error('Failed to update project timeline');
    }
  }

  /**
   * Create a milestone
   */
  static async createMilestone(data: {
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
  }): Promise<ProjectMilestone> {
    try {
      const milestoneData = {
        timeline_id: data.timelineId,
        job_id: data.jobId,
        title: data.title,
        description: data.description,
        target_date: data.targetDate,
        priority: data.priority,
        type: data.type,
        assigned_to: data.assignedTo,
        estimated_hours: data.estimatedHours,
        payment_amount: data.paymentAmount,
        dependencies: data.dependencies,
        created_by: data.createdBy,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: milestone, error } = await supabase
        .from('project_milestones')
        .insert([milestoneData])
        .select('*')
        .single();

      if (error) throw error;

      // Update timeline progress
      await this.updateTimelineProgress(data.timelineId);

      return this.mapMilestoneFromDb(milestone);
    } catch (error) {
      console.error('Failed to create milestone:', error);
      throw new Error('Failed to create milestone');
    }
  }

  /**
   * Update milestone
   */
  static async updateMilestone(
    milestoneId: string,
    updates: Partial<Pick<ProjectMilestone, 'title' | 'description' | 'targetDate' | 'status' | 'priority' | 'actualHours' | 'completedDate'>>
  ): Promise<ProjectMilestone> {
    try {
      const updateData = {
        ...updates,
        completed_date: updates.completedDate,
        actual_hours: updates.actualHours,
        target_date: updates.targetDate,
        updated_at: new Date().toISOString()
      };

      const { data: milestone, error } = await supabase
        .from('project_milestones')
        .update(updateData)
        .eq('id', milestoneId)
        .select('*')
        .single();

      if (error) throw error;

      // Update timeline progress if milestone was completed
      if (updates.status === 'completed') {
        await this.updateTimelineProgress(milestone.timeline_id);
      }

      return this.mapMilestoneFromDb(milestone);
    } catch (error) {
      console.error('Failed to update milestone:', error);
      throw new Error('Failed to update milestone');
    }
  }

  /**
   * Get milestones for a timeline
   */
  static async getMilestones(timelineId: string): Promise<ProjectMilestone[]> {
    try {
      const { data: milestones, error } = await supabase
        .from('project_milestones')
        .select(`
          *,
          users!project_milestones_assigned_to_fkey(id, first_name, last_name, email)
        `)
        .eq('timeline_id', timelineId)
        .order('target_date', { ascending: true });

      if (error) throw error;

      return (milestones || []).map(this.mapMilestoneFromDb);
    } catch (error) {
      console.error('Failed to get milestones:', error);
      throw new Error('Failed to retrieve milestones');
    }
  }

  /**
   * Complete a milestone
   */
  static async completeMilestone(milestoneId: string, actualHours?: number): Promise<ProjectMilestone> {
    const completedDate = new Date().toISOString();

    const updates: Partial<ProjectMilestone> = {
      status: 'completed',
      completedDate,
      actualHours
    };

    return this.updateMilestone(milestoneId, updates);
  }

  /**
   * Get project progress
   */
  static async getProjectProgress(timelineId: string): Promise<ProjectProgress> {
    try {
      const { data: milestones, error } = await supabase
        .from('project_milestones')
        .select('status, target_date, completed_date')
        .eq('timeline_id', timelineId);

      if (error) throw error;

      const totalMilestones = milestones?.length || 0;
      const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0;
      const overdueMilestones = milestones?.filter(m =>
        m.status !== 'completed' && new Date(m.target_date) < new Date()
      ).length || 0;
      const upcomingMilestones = milestones?.filter(m =>
        m.status === 'pending' && new Date(m.target_date) > new Date()
      ).length || 0;

      const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

      // Get timeline info
      const { data: timeline } = await supabase
        .from('project_timelines')
        .select('estimated_end_date')
        .eq('id', timelineId)
        .single();

      const estimatedEndDate = timeline?.estimated_end_date;
      const now = new Date();
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

      // Estimate completion based on progress
      let estimatedCompletion = estimatedEndDate || now.toISOString();
      if (progressPercentage > 0 && progressPercentage < 100 && endDate) {
        const totalDuration = endDate.getTime() - new Date().getTime();
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
    } catch (error) {
      console.error('Failed to get project progress:', error);
      throw new Error('Failed to calculate project progress');
    }
  }

  /**
   * Add note to milestone
   */
  static async addMilestoneNote(data: {
    milestoneId: string;
    content: string;
    type: MilestoneNote['type'];
    visibility: MilestoneNote['visibility'];
    authorId: string;
  }): Promise<MilestoneNote> {
    try {
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
        .single();

      if (error) throw error;

      return this.mapNoteFromDb(note);
    } catch (error) {
      console.error('Failed to add milestone note:', error);
      throw new Error('Failed to add note');
    }
  }

  /**
   * Get milestone notes
   */
  static async getMilestoneNotes(milestoneId: string, userId: string, userRole: string): Promise<MilestoneNote[]> {
    try {
      let query = supabase
        .from('milestone_notes')
        .select(`
          *,
          users!milestone_notes_author_id_fkey(id, first_name, last_name)
        `)
        .eq('milestone_id', milestoneId);

      // Filter by visibility based on user role
      if (userRole === 'contractor') {
        query = query.in('visibility', ['public', 'contractor_only']);
      } else if (userRole === 'homeowner') {
        query = query.in('visibility', ['public', 'homeowner_only']);
      }

      const { data: notes, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      return (notes || []).map(this.mapNoteFromDb);
    } catch (error) {
      console.error('Failed to get milestone notes:', error);
      throw new Error('Failed to retrieve notes');
    }
  }

  /**
   * Get project analytics
   */
  static async getProjectAnalytics(timelineId: string): Promise<ProjectAnalytics> {
    try {
      const [timeline, milestones, progress] = await Promise.all([
        supabase.from('project_timelines').select('*').eq('id', timelineId).single(),
        supabase.from('project_milestones').select('*').eq('timeline_id', timelineId),
        this.getProjectProgress(timelineId)
      ]);

      if (timeline.error) throw timeline.error;
      if (milestones.error) throw milestones.error;

      const timelineData = timeline.data;
      const milestonesData = milestones.data || [];

      // Calculate duration
      const startDate = new Date(timelineData.start_date);
      const endDate = timelineData.actual_end_date ?
        new Date(timelineData.actual_end_date) : new Date();
      const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

      const estimatedEndDate = new Date(timelineData.estimated_end_date);
      const estimatedDuration = Math.ceil((estimatedEndDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

      // Calculate milestone performance
      const onTime = milestonesData.filter(m =>
        m.status === 'completed' &&
        m.completed_date &&
        new Date(m.completed_date) <= new Date(m.target_date)
      ).length;

      const late = milestonesData.filter(m =>
        m.status === 'completed' &&
        m.completed_date &&
        new Date(m.completed_date) > new Date(m.target_date)
      ).length;

      const early = milestonesData.filter(m =>
        m.status === 'completed' &&
        m.completed_date &&
        new Date(m.completed_date) < new Date(m.target_date)
      ).length;

      const cancelled = milestonesData.filter(m => m.status === 'cancelled').length;

      // Mock budget data (would come from actual payment tracking)
      const totalBudget = 10000; // Would get from job budget
      const milestonePayments = milestonesData
        .filter(m => m.status === 'completed' && m.payment_amount)
        .reduce((sum, m) => sum + (m.payment_amount || 0), 0);

      // Identify bottlenecks
      const bottlenecks: ProjectBottleneck[] = milestonesData
        .filter(m => {
          if (m.status === 'completed' && m.completed_date) {
            const delay = new Date(m.completed_date).getTime() - new Date(m.target_date).getTime();
            return delay > (2 * 24 * 60 * 60 * 1000); // More than 2 days late
          }
          return false;
        })
        .map(m => {
          const delayDays = Math.ceil(
            (new Date(m.completed_date!).getTime() - new Date(m.target_date).getTime()) / (1000 * 3600 * 24)
          );

          return {
            milestoneId: m.id,
            milestoneName: m.title,
            delayDays,
            impact: delayDays > 7 ? 'high' as const : delayDays > 3 ? 'medium' as const : 'low' as const,
            reason: 'Task complexity exceeded estimates',
            suggestedAction: 'Break down complex tasks into smaller milestones'
          };
        });

      // Generate recommendations
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
          variance: ((totalDuration - estimatedDuration) / estimatedDuration) * 100
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
          pendingPayments: milestonesData
            .filter(m => m.status === 'completed' && !m.payment_amount)
            .length * 1000 // Mock pending payment
        },
        bottlenecks,
        recommendations
      };
    } catch (error) {
      console.error('Failed to get project analytics:', error);
      throw new Error('Failed to retrieve project analytics');
    }
  }

  /**
   * Get timeline templates
   */
  static async getTimelineTemplates(category?: string): Promise<TimelineTemplate[]> {
    try {
      let query = supabase
        .from('timeline_templates')
        .select('*')
        .eq('is_public', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data: templates, error } = await query.order('usage_count', { ascending: false });

      if (error) throw error;

      return (templates || []).map(this.mapTemplateFromDb);
    } catch (error) {
      console.error('Failed to get timeline templates:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Create timeline from template
   */
  static async createTimelineFromTemplate(data: {
    templateId: string;
    jobId: string;
    startDate: string;
    createdBy: string;
    customizations?: {
      title?: string;
      description?: string;
      adjustDays?: number;
    };
  }): Promise<ProjectTimeline> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('timeline_templates')
        .select(`
          *,
          milestone_templates(*)
        `)
        .eq('id', data.templateId)
        .single();

      if (templateError) throw templateError;

      // Calculate end date
      const startDate = new Date(data.startDate);
      const durationAdjustment = data.customizations?.adjustDays || 0;
      const estimatedEndDate = new Date(startDate);
      estimatedEndDate.setDate(startDate.getDate() + template.estimated_duration + durationAdjustment);

      // Create timeline
      const timeline = await this.createTimeline({
        jobId: data.jobId,
        title: data.customizations?.title || template.name,
        description: data.customizations?.description || template.description,
        startDate: data.startDate,
        estimatedEndDate: estimatedEndDate.toISOString(),
        priority: 'medium',
        createdBy: data.createdBy
      });

      // Create milestones from template
      const milestoneTemplates = template.milestone_templates || [];
      for (const milestoneTemplate of milestoneTemplates) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + milestoneTemplate.day_offset + durationAdjustment);

        await this.createMilestone({
          timelineId: timeline.id,
          jobId: data.jobId,
          title: milestoneTemplate.title,
          description: milestoneTemplate.description,
          targetDate: targetDate.toISOString(),
          priority: milestoneTemplate.priority,
          type: milestoneTemplate.type,
          estimatedHours: milestoneTemplate.estimated_hours,
          createdBy: data.createdBy
        });
      }

      return timeline;
    } catch (error) {
      console.error('Failed to create timeline from template:', error);
      throw new Error('Failed to create timeline from template');
    }
  }

  /**
   * Private helper methods
   */
  private static async updateTimelineProgress(timelineId: string): Promise<void> {
    try {
      const progress = await this.getProjectProgress(timelineId);

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

  private static mapTimelineFromDb(timeline: any): ProjectTimeline {
    return {
      id: timeline.id,
      jobId: timeline.job_id,
      title: timeline.title,
      description: timeline.description,
      startDate: timeline.start_date,
      estimatedEndDate: timeline.estimated_end_date,
      actualEndDate: timeline.actual_end_date,
      status: timeline.status,
      progress: timeline.progress,
      priority: timeline.priority,
      createdBy: timeline.created_by,
      createdAt: timeline.created_at,
      updatedAt: timeline.updated_at,
      job: timeline.jobs,
      milestones: timeline.project_milestones?.map(this.mapMilestoneFromDb),
      totalMilestones: timeline.project_milestones?.length,
      completedMilestones: timeline.project_milestones?.filter((m: any) => m.status === 'completed').length
    };
  }

  private static mapMilestoneFromDb(milestone: any): ProjectMilestone {
    return {
      id: milestone.id,
      timelineId: milestone.timeline_id,
      jobId: milestone.job_id,
      title: milestone.title,
      description: milestone.description,
      targetDate: milestone.target_date,
      completedDate: milestone.completed_date,
      status: milestone.status,
      priority: milestone.priority,
      type: milestone.type,
      assignedTo: milestone.assigned_to,
      estimatedHours: milestone.estimated_hours,
      actualHours: milestone.actual_hours,
      paymentAmount: milestone.payment_amount,
      dependencies: milestone.dependencies,
      createdBy: milestone.created_by,
      createdAt: milestone.created_at,
      updatedAt: milestone.updated_at,
      assignee: milestone.users
    };
  }

  private static mapNoteFromDb(note: any): MilestoneNote {
    return {
      id: note.id,
      milestoneId: note.milestone_id,
      content: note.content,
      type: note.type,
      visibility: note.visibility,
      authorId: note.author_id,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      author: note.users
    };
  }

  private static mapTemplateFromDb(template: any): TimelineTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      estimatedDuration: template.estimated_duration,
      milestoneTemplates: template.milestone_templates || [],
      createdBy: template.created_by,
      isPublic: template.is_public,
      usageCount: template.usage_count,
      rating: template.rating,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    };
  }
}