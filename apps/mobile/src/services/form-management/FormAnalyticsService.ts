import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

export interface FormAnalytics {
  id: string;
  contractor_id: string;
  template_id?: string;
  job_sheet_id?: string;
  form_completion_time?: number;
  field_completion_rates?: any;
  error_count: number;
  revision_count: number;
  accuracy_score?: number;
  completeness_score?: number;
  timeliness_score?: number;
  device_type?: string;
  offline_completion: boolean;
  sync_issues: number;
  start_date?: string;
  completion_date?: string;
  created_at: string;
}

export interface JobSheetSummaryStats {
  total_sheets: number;
  completed_sheets: number;
  pending_sheets: number;
  overdue_sheets: number;
  average_completion_time: number;
  average_quality_score: number;
  completion_rate: number;
  on_time_completion_rate: number;
}

export class FormAnalyticsService {
  static async getJobSheetSummaryStats(
    contractorId: string
  ): Promise<JobSheetSummaryStats> {
    try {
      const { data, error } = await supabase
        .from('job_sheets')
        .select(
          'status, completed_at, due_date, quality_score, created_at, started_at'
        )
        .eq('contractor_id', contractorId);

      if (error) throw error;

      const sheets = data || [];
      const totalSheets = sheets.length;
      const completedSheets = sheets.filter(
        (s: any) => s.status === 'completed' || s.status === 'approved'
      ).length;
      const pendingSheets = sheets.filter((s: any) =>
        ['created', 'in_progress', 'pending_review'].includes(s.status)
      ).length;

      const now = new Date();
      const overdueSheets = sheets.filter(
        (s: any) =>
          s.due_date &&
          new Date(s.due_date) < now &&
          !['completed', 'approved'].includes(s.status)
      ).length;

      // Calculate average completion time (in hours)
      const completedWithTimes = sheets.filter(
        (s: any) => s.started_at && s.completed_at
      );
      const avgCompletionTime =
        completedWithTimes.length > 0
          ? completedWithTimes.reduce((sum: number, s: any) => {
              const start = new Date(s.started_at!).getTime();
              const end = new Date(s.completed_at!).getTime();
              return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
            }, 0) / completedWithTimes.length
          : 0;

      // Calculate average quality score
      const sheetsWithQuality = sheets.filter(
        (s: any) => s.quality_score !== null
      );
      const avgQualityScore =
        sheetsWithQuality.length > 0
          ? sheetsWithQuality.reduce(
              (sum: number, s: any) => sum + (s.quality_score || 0),
              0
            ) / sheetsWithQuality.length
          : 0;

      // Calculate completion rate
      const completionRate =
        totalSheets > 0 ? (completedSheets / totalSheets) * 100 : 0;

      // Calculate on-time completion rate
      const completedOnTime = sheets.filter(
        (s: any) =>
          s.completed_at &&
          s.due_date &&
          new Date(s.completed_at) <= new Date(s.due_date)
      ).length;
      const onTimeCompletionRate =
        completedSheets > 0 ? (completedOnTime / completedSheets) * 100 : 0;

      return {
        total_sheets: totalSheets,
        completed_sheets: completedSheets,
        pending_sheets: pendingSheets,
        overdue_sheets: overdueSheets,
        average_completion_time: avgCompletionTime,
        average_quality_score: avgQualityScore,
        completion_rate: completionRate,
        on_time_completion_rate: onTimeCompletionRate,
      };
    } catch (error) {
      logger.error('Error fetching job sheet summary stats', error);
      throw new Error('Failed to fetch job sheet summary stats');
    }
  }

  static async createFormAnalytics(
    contractorId: string,
    analyticsData: Partial<FormAnalytics>
  ): Promise<FormAnalytics> {
    try {
      const { data, error } = await supabase
        .from('form_analytics')
        .insert({
          contractor_id: contractorId,
          ...analyticsData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating form analytics', error);
      throw new Error('Failed to create form analytics');
    }
  }

  static async getContractorAnalytics(
    contractorId: string,
    timeRange?: { start: string; end: string }
  ): Promise<FormAnalytics[]> {
    try {
      let query = supabase
        .from('form_analytics')
        .select('*')
        .eq('contractor_id', contractorId);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching contractor analytics', error);
      throw new Error('Failed to fetch contractor analytics');
    }
  }

  static async getTemplatePerformanceStats(
    templateId: string
  ): Promise<{
    usage_count: number;
    average_completion_time: number;
    error_rate: number;
    completion_rate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('form_analytics')
        .select('form_completion_time, error_count, completeness_score')
        .eq('template_id', templateId);

      if (error) throw error;

      const analytics = data || [];
      const usageCount = analytics.length;

      if (usageCount === 0) {
        return {
          usage_count: 0,
          average_completion_time: 0,
          error_rate: 0,
          completion_rate: 0,
        };
      }

      const avgCompletionTime =
        analytics.reduce((sum, a) => sum + (a.form_completion_time || 0), 0) / usageCount;

      const totalErrors = analytics.reduce((sum, a) => sum + a.error_count, 0);
      const errorRate = (totalErrors / usageCount) * 100;

      const completedForms = analytics.filter(a => a.completeness_score === 100).length;
      const completionRate = (completedForms / usageCount) * 100;

      return {
        usage_count: usageCount,
        average_completion_time: avgCompletionTime,
        error_rate: errorRate,
        completion_rate: completionRate,
      };
    } catch (error) {
      logger.error('Error fetching template performance stats', error);
      throw new Error('Failed to fetch template performance stats');
    }
  }

  static async trackFormInteraction(
    contractorId: string,
    templateId: string,
    interactionData: {
      job_sheet_id?: string;
      field_name: string;
      action: 'focus' | 'blur' | 'change' | 'error';
      value?: any;
      error_message?: string;
    }
  ): Promise<void> {
    try {
      await supabase
        .from('form_interactions')
        .insert({
          contractor_id: contractorId,
          template_id: templateId,
          job_sheet_id: interactionData.job_sheet_id,
          field_name: interactionData.field_name,
          action: interactionData.action,
          value: interactionData.value,
          error_message: interactionData.error_message,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      logger.error('Error tracking form interaction', error);
      // Don't throw error for analytics - fail silently
    }
  }

  static async generatePerformanceReport(
    contractorId: string,
    dateRange: { start: string; end: string }
  ): Promise<{
    summary: JobSheetSummaryStats;
    template_performance: any[];
    trends: any;
  }> {
    try {
      // Get summary stats
      const summary = await this.getJobSheetSummaryStats(contractorId);

      // Get template performance
      const { data: templates, error: templatesError } = await supabase
        .from('form_templates')
        .select('id, template_name')
        .eq('contractor_id', contractorId);

      if (templatesError) throw templatesError;

      const templatePerformance = await Promise.all(
        (templates || []).map(async (template) => {
          const stats = await this.getTemplatePerformanceStats(template.id);
          return {
            template_name: template.template_name,
            ...stats,
          };
        })
      );

      // Calculate trends (simplified)
      const { data: trendsData, error: trendsError } = await supabase
        .from('form_analytics')
        .select('created_at, form_completion_time, error_count')
        .eq('contractor_id', contractorId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at');

      if (trendsError) throw trendsError;

      return {
        summary,
        template_performance: templatePerformance,
        trends: trendsData || [],
      };
    } catch (error) {
      logger.error('Error generating performance report', error);
      throw new Error('Failed to generate performance report');
    }
  }
}