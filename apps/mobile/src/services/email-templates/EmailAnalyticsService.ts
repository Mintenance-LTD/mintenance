import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import type { EmailAnalytics, TemplateVariable } from './types';

export async function getAvailableVariables(): Promise<TemplateVariable[]> {
  try {
    const data = await mobileApiClient.get<TemplateVariable[]>(
      `/api/email/templates/variables`
    );
    return data || [];
  } catch (error) { logger.error('Error fetching template variables:', error); throw error; }
}

export async function getVariablesByCategory(category: TemplateVariable['variable_category']): Promise<TemplateVariable[]> {
  try {
    const data = await mobileApiClient.get<TemplateVariable[]>(
      `/api/email/templates/variables?category=${category}`
    );
    return data || [];
  } catch (error) { logger.error('Error fetching variables by category:', error); throw error; }
}

export async function getEmailAnalytics(
  contractorId: string, periodStart: string, periodEnd: string, templateId?: string
): Promise<EmailAnalytics | null> {
  try {
    let url = `/api/email/history/analytics?contractor_id=${contractorId}&period_start=${periodStart}&period_end=${periodEnd}`;
    if (templateId) url += `&template_id=${templateId}`;
    const data = await mobileApiClient.get<EmailAnalytics>(url);
    return data || null;
  } catch (error) { logger.error('Error fetching email analytics:', error); return null; }
}

export async function generateAnalyticsReport(
  contractorId: string, periodStart: string, periodEnd: string
): Promise<{ summary: EmailAnalytics; by_template: (EmailAnalytics & { template_name: string })[]; by_category: { category: string; metrics: EmailAnalytics }[] }> {
  try {
    const history = await mobileApiClient.get<Record<string, unknown>[]>(
      `/api/email/history?contractor_id=${contractorId}&sent_after=${periodStart}&sent_before=${periodEnd}`
    );

    const records = history || [];
    const totalSent = records.length;
    const delivered = records.filter((h) => h.status === 'delivered').length;
    const opened = records.filter((h) => (h.open_count as number) > 0).length;
    const clicked = records.filter((h) => (h.click_count as number) > 0).length;
    const bounced = records.filter((h) => h.status === 'bounced').length;

    const summary: EmailAnalytics = {
      id: '', contractor_id: contractorId, period_start: periodStart, period_end: periodEnd,
      emails_sent: totalSent, emails_delivered: delivered, emails_bounced: bounced, emails_failed: 0,
      unique_opens: opened,
      total_opens: records.reduce((sum: number, h) => sum + ((h.open_count as number) || 0), 0),
      unique_clicks: clicked,
      total_clicks: records.reduce((sum: number, h) => sum + ((h.click_count as number) || 0), 0),
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
