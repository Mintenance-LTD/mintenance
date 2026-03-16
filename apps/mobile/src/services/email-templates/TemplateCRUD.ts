import { mobileApiClient } from '../../utils/mobileApiClient';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { EmailTemplate } from './types';

export async function createTemplate(templateData: {
  contractor_id: string; template_name: string;
  template_category: EmailTemplate['template_category'];
  template_type?: EmailTemplate['template_type'];
  subject_line: string; text_content: string; html_content?: string;
  preview_text?: string; description?: string; variables?: string[];
  required_variables?: string[]; brand_colors?: { primary?: string; secondary?: string };
  logo_url?: string; company_signature?: string; footer_content?: string;
  auto_send_trigger?: string; auto_send_delay_hours?: number; auto_send_conditions?: unknown;
}): Promise<EmailTemplate> {
  try {
    const response = await mobileApiClient.post<{ data: EmailTemplate }>('/api/email/templates', {
      name: templateData.template_name,
      subject: templateData.subject_line,
      body: templateData.text_content,
      category: templateData.template_category,
    });
    return response.data;
  } catch (error) { logger.error('Error creating email template:', error); throw error; }
}

export async function getTemplates(contractorId: string): Promise<EmailTemplate[]> {
  try {
    const { data, error } = await supabase.from('email_templates').select('*')
      .eq('contractor_id', contractorId)
      .order('template_category', { ascending: true })
      .order('template_name', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) { logger.error('Error fetching email templates:', error); throw error; }
}

export async function getTemplatesByCategory(
  contractorId: string, category: EmailTemplate['template_category']
): Promise<EmailTemplate[]> {
  try {
    const { data, error } = await supabase.from('email_templates').select('*')
      .eq('contractor_id', contractorId).eq('template_category', category).eq('is_active', true)
      .order('template_name', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) { logger.error('Error fetching templates by category:', error); throw error; }
}

export async function getTemplate(templateId: string): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase.from('email_templates').select('*').eq('id', templateId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) { logger.error('Error fetching email template:', error); return null; }
}

export async function updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
  try {
    const response = await mobileApiClient.put<{ data: EmailTemplate }>(`/api/email/templates/${templateId}`, {
      name: updates.template_name,
      subject: updates.subject_line,
      body: updates.text_content,
      category: updates.template_category,
    });
    return response.data;
  } catch (error) { logger.error('Error updating email template:', error); throw error; }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    await mobileApiClient.delete(`/api/email/templates/${templateId}`);
  } catch (error) { logger.error('Error deleting email template:', error); throw error; }
}

export async function duplicateTemplate(templateId: string, _newName: string): Promise<EmailTemplate> {
  try {
    const response = await mobileApiClient.post<{ data: EmailTemplate }>(
      `/api/email/templates/${templateId}/duplicate`,
      {},
    );
    return response.data;
  } catch (error) { logger.error('Error duplicating template:', error); throw error; }
}
