import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { EmailAnalytics, TemplateVariable } from './types';

export async function getAvailableVariables(): Promise<TemplateVariable[]> {
  try {
    const { data, error } = await supabase.from('template_variables').select('*')
      .order('variable_category', { ascending: true }).order('variable_name', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) { logger.error('Error fetching template variables:', error); throw error; }
}

export async function getVariablesByCategory(category: TemplateVariable['variable_category']): Promise<TemplateVariable[]> {
  try {
    const { data, error } = await supabase.from('template_variables').select('*')
      .eq('variable_category', category).order('variable_name', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) { logger.error('Error fetching variables by category:', error); throw error; }
}

export async function getEmailAnalytics(
  contractorId: string, periodStart: string, periodEnd: string, templateId?: string
): Promise<EmailAnalytics | null> {
  try {
    let query = supabase.from('email_analytics').select('*')
      .eq('contractor_id', contractorId).eq('period_start', periodStart).eq('period_end', periodEnd);
    if (templateId) query = query.eq('template_id', templateId);
    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) { logger.error('Error fetching email analytics:', error); return null; }
}

export async function generateAnalyticsReport(
  contractorId: string, periodStart: string, periodEnd: string
): Promise<{ summary: EmailAnalytics; by_template: (EmailAnalytics & { template_name: string })[]; by_category: { category: string; metrics: EmailAnalytics }[] }> {
  try {
    const { data: history, error } = await supabase.from('email_history').select('*')
      .eq('contractor_id', contractorId).gte('sent_at', periodStart).lte('sent_at', periodEnd);
    if (error) throw error;

    const totalSent = history?.length || 0;
    const delivered = history?.filter((h: Record<string, unknown>) => h.status === 'delivered').length || 0;
    const opened = history?.filter((h: Record<string, unknown>) => (h.open_count as number) > 0).length || 0;
    const clicked = history?.filter((h: Record<string, unknown>) => (h.click_count as number) > 0).length || 0;
    const bounced = history?.filter((h: Record<string, unknown>) => h.status === 'bounced').length || 0;

    const summary: EmailAnalytics = {
      id: '', contractor_id: contractorId, period_start: periodStart, period_end: periodEnd,
      emails_sent: totalSent, emails_delivered: delivered, emails_bounced: bounced, emails_failed: 0,
      unique_opens: opened,
      total_opens: history?.reduce((sum: number, h: Record<string, unknown>) => sum + (h.open_count as number), 0) || 0,
      unique_clicks: clicked,
      total_clicks: history?.reduce((sum: number, h: Record<string, unknown>) => sum + (h.click_count as number), 0) || 0,
      unsubscribes: 0, complaints: 0,
      delivery_rate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
      click_rate: opened > 0 ? (clicked / opened) * 100 : 0,
      bounce_rate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
      unsubscribe_rate: 0, leads_generated: 0, jobs_booked: 0, revenue_generated: 0,
      created_at: new Date().toISOString(),
    };
    return { summary, by_template: [], by_category: [] };
  } catch (error) { logger.error('Error generating analytics report:', error); throw error; }
}
