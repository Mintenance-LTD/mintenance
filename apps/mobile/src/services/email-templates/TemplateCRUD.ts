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
    const { data, error } = await supabase.from('email_templates').insert([{
      ...templateData,
      template_type: templateData.template_type || 'professional',
      is_active: true, is_default: false, language_code: 'en-GB', times_used: 0,
      variables: templateData.variables || [],
      required_variables: templateData.required_variables || [],
      brand_colors: templateData.brand_colors || {},
      auto_send_delay_hours: templateData.auto_send_delay_hours || 0,
      auto_send_conditions: templateData.auto_send_conditions || {},
    }]).select().single();
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase.from('email_templates').update(updates).eq('id', templateId).select().single();
    if (error) throw error;
    return data;
  } catch (error) { logger.error('Error updating email template:', error); throw error; }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase.from('email_templates').delete().eq('id', templateId);
    if (error) throw error;
  } catch (error) { logger.error('Error deleting email template:', error); throw error; }
}

export async function duplicateTemplate(templateId: string, newName: string): Promise<EmailTemplate> {
  try {
    const original = await getTemplate(templateId);
    if (!original) throw new Error('Original template not found');
    const { data, error } = await supabase.from('email_templates').insert([{
      contractor_id: original.contractor_id, template_name: newName,
      template_category: original.template_category, template_type: original.template_type,
      subject_line: original.subject_line, html_content: original.html_content,
      text_content: original.text_content, preview_text: original.preview_text,
      description: `Copy of ${original.description || original.template_name}`,
      is_active: true, is_default: false, language_code: original.language_code,
      variables: original.variables, required_variables: original.required_variables,
      brand_colors: original.brand_colors, logo_url: original.logo_url,
      company_signature: original.company_signature, footer_content: original.footer_content,
      times_used: 0,
    }]).select().single();
    if (error) throw error;
    return data;
  } catch (error) { logger.error('Error duplicating template:', error); throw error; }
}
