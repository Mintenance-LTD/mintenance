import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { EmailHistory } from './types';
import { processTemplate } from './TemplateProcessor';

export async function sendEmail(emailData: {
  template_id?: string; contractor_id: string; recipient_email: string;
  recipient_name?: string; subject_line: string; text_content: string;
  html_content?: string; job_id?: string; invoice_id?: string;
  context_type?: string; context_data?: unknown; variables?: Record<string, unknown>;
}): Promise<{ success: boolean; email_id: string; error?: string }> {
  try {
    let processedContent: { subject_line: string; text_content: string; html_content?: string } = {
      subject_line: emailData.subject_line,
      text_content: emailData.text_content,
      html_content: emailData.html_content,
    };

    if (emailData.template_id && emailData.variables) {
      processedContent = await processTemplate(emailData.template_id, emailData.variables);
    }

    const { data: emailRecord, error: historyError } = await supabase.from('email_history').insert([{
      template_id: emailData.template_id, contractor_id: emailData.contractor_id,
      recipient_email: emailData.recipient_email, recipient_name: emailData.recipient_name,
      subject_line: processedContent.subject_line, text_content: processedContent.text_content,
      html_content: processedContent.html_content, job_id: emailData.job_id,
      invoice_id: emailData.invoice_id, context_type: emailData.context_type || 'manual',
      context_data: emailData.context_data || {}, status: 'sent', send_attempts: 1,
      open_count: 0, click_count: 0, device_info: {}, location_info: {},
    }]).select().single();

    if (historyError) throw historyError;

    if (emailData.template_id) {
      await supabase.from('email_templates').update({
        times_used: supabase.raw('times_used + 1'), last_used: new Date().toISOString(),
      }).eq('id', emailData.template_id);
    }

    return { success: true, email_id: emailRecord.id };
  } catch (error) {
    logger.error('Error sending email:', error);
    return { success: false, email_id: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getEmailHistory(contractorId: string, limit: number = 50): Promise<EmailHistory[]> {
  try {
    const { data, error } = await supabase.from('email_history').select('*')
      .eq('contractor_id', contractorId).order('sent_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) { logger.error('Error fetching email history:', error); throw error; }
}
