import { mobileApiClient } from '../../utils/mobileApiClient';
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

    const response = await mobileApiClient.post<{ data: { id: string } }>('/api/email/history', {
      template_id: emailData.template_id,
      recipient_email: emailData.recipient_email,
      subject: processedContent.subject_line,
      body: processedContent.text_content,
    });

    return { success: true, email_id: response.data.id };
  } catch (error) {
    logger.error('Error sending email:', error);
    return { success: false, email_id: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getEmailHistory(contractorId: string, limit: number = 50): Promise<EmailHistory[]> {
  try {
    const params = new URLSearchParams();
    params.set('contractor_id', contractorId);
    params.set('limit', String(limit));
    const response = await mobileApiClient.get<{ data: EmailHistory[] }>(
      `/api/email/history?${params.toString()}`
    );
    return response.data || [];
  } catch (error) { logger.error('Error fetching email history:', error); throw error; }
}
