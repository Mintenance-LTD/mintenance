import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// =====================================================
// EMAIL TEMPLATES INTERFACES
// =====================================================

export interface EmailTemplate {
  id: string;
  contractor_id: string;
  template_name: string;
  template_category:
    | 'invoice'
    | 'quote'
    | 'reminder'
    | 'confirmation'
    | 'follow_up'
    | 'welcome'
    | 'completion'
    | 'marketing'
    | 'appointment'
    | 'custom';
  template_type: 'professional' | 'friendly' | 'formal' | 'custom';
  subject_line: string;
  html_content?: string;
  text_content: string;
  preview_text?: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  language_code: string;
  times_used: number;
  last_used?: string;
  variables: string[];
  required_variables: string[];
  brand_colors: {
    primary?: string;
    secondary?: string;
  };
  logo_url?: string;
  company_signature?: string;
  footer_content?: string;
  auto_send_trigger?: string;
  auto_send_delay_hours: number;
  auto_send_conditions: any;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  id: string;
  variable_name: string;
  variable_category:
    | 'client'
    | 'contractor'
    | 'job'
    | 'invoice'
    | 'payment'
    | 'company'
    | 'system';
  description?: string;
  example_value?: string;
  data_type: 'text' | 'number' | 'date' | 'currency' | 'boolean';
  is_required: boolean;
  default_value?: string;
  created_at: string;
}

export interface EmailHistory {
  id: string;
  template_id?: string;
  contractor_id: string;
  recipient_email: string;
  recipient_name?: string;
  subject_line: string;
  html_content?: string;
  text_content: string;
  job_id?: string;
  invoice_id?: string;
  context_type?: string;
  context_data: any;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  external_id?: string;
  send_attempts: number;
  error_message?: string;
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  open_count: number;
  click_count: number;
  device_info: any;
  location_info: any;
  created_at: string;
}

export interface EmailAnalytics {
  id: string;
  contractor_id: string;
  template_id?: string;
  period_start: string;
  period_end: string;
  emails_sent: number;
  emails_delivered: number;
  emails_bounced: number;
  emails_failed: number;
  unique_opens: number;
  total_opens: number;
  unique_clicks: number;
  total_clicks: number;
  unsubscribes: number;
  complaints: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
  leads_generated: number;
  jobs_booked: number;
  revenue_generated: number;
  created_at: string;
}

// =====================================================
// EMAIL TEMPLATES SERVICE
// =====================================================

export class EmailTemplatesService {
  // =====================================================
  // TEMPLATE MANAGEMENT
  // =====================================================

  static async createTemplate(templateData: {
    contractor_id: string;
    template_name: string;
    template_category: EmailTemplate['template_category'];
    template_type?: EmailTemplate['template_type'];
    subject_line: string;
    text_content: string;
    html_content?: string;
    preview_text?: string;
    description?: string;
    variables?: string[];
    required_variables?: string[];
    brand_colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    company_signature?: string;
    footer_content?: string;
    auto_send_trigger?: string;
    auto_send_delay_hours?: number;
    auto_send_conditions?: any;
  }): Promise<EmailTemplate> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert([
          {
            ...templateData,
            template_type: templateData.template_type || 'professional',
            is_active: true,
            is_default: false,
            language_code: 'en-GB',
            times_used: 0,
            variables: templateData.variables || [],
            required_variables: templateData.required_variables || [],
            brand_colors: templateData.brand_colors || {},
            auto_send_delay_hours: templateData.auto_send_delay_hours || 0,
            auto_send_conditions: templateData.auto_send_conditions || {},
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating email template:', error);
      throw error;
    }
  }

  static async getTemplates(contractorId: string): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('template_category', { ascending: true })
        .order('template_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching email templates:', error);
      throw error;
    }
  }

  static async getTemplatesByCategory(
    contractorId: string,
    category: EmailTemplate['template_category']
  ): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('template_category', category)
        .eq('is_active', true)
        .order('template_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching templates by category:', error);
      throw error;
    }
  }

  static async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching email template:', error);
      return null;
    }
  }

  static async updateTemplate(
    templateId: string,
    updates: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating email template:', error);
      throw error;
    }
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting email template:', error);
      throw error;
    }
  }

  // =====================================================
  // TEMPLATE VARIABLES
  // =====================================================

  static async getAvailableVariables(): Promise<TemplateVariable[]> {
    try {
      const { data, error } = await supabase
        .from('template_variables')
        .select('*')
        .order('variable_category', { ascending: true })
        .order('variable_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching template variables:', error);
      throw error;
    }
  }

  static async getVariablesByCategory(
    category: TemplateVariable['variable_category']
  ): Promise<TemplateVariable[]> {
    try {
      const { data, error } = await supabase
        .from('template_variables')
        .select('*')
        .eq('variable_category', category)
        .order('variable_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching variables by category:', error);
      throw error;
    }
  }

  // =====================================================
  // TEMPLATE PROCESSING
  // =====================================================

  static async processTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<{
    subject_line: string;
    html_content?: string;
    text_content: string;
  }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Validate required variables
      const { data: missingVars } = await supabase.rpc(
        'validate_template_variables',
        {
          template_id: templateId,
          provided_variables: variables,
        }
      );

      if (missingVars && missingVars.length > 0) {
        throw new Error(
          `Missing required variables: ${missingVars.join(', ')}`
        );
      }

      // Process subject line
      const { data: processedSubject } = await supabase.rpc(
        'replace_template_variables',
        {
          template_content: template.subject_line,
          variables,
        }
      );

      // Process text content
      const { data: processedText } = await supabase.rpc(
        'replace_template_variables',
        {
          template_content: template.text_content,
          variables,
        }
      );

      // Process HTML content if available
      let processedHtml: string | undefined;
      if (template.html_content) {
        const { data: htmlData } = await supabase.rpc(
          'replace_template_variables',
          {
            template_content: template.html_content,
            variables,
          }
        );
        processedHtml = htmlData;
      }

      return {
        subject_line: processedSubject || template.subject_line,
        text_content: processedText || template.text_content,
        html_content: processedHtml,
      };
    } catch (error) {
      logger.error('Error processing template:', error);
      throw error;
    }
  }

  // Client-side fallback for template variable replacement
  static replaceVariables(
    content: string,
    variables: Record<string, any>
  ): string {
    let result = content;
    Object.keys(variables).forEach((key) => {
      const value = variables[key];
      const placeholder = `{{${key}}}`;
      result = result.replace(
        new RegExp(placeholder, 'g'),
        String(value || '')
      );
    });
    return result;
  }

  // =====================================================
  // EMAIL SENDING & TRACKING
  // =====================================================

  static async sendEmail(emailData: {
    template_id?: string;
    contractor_id: string;
    recipient_email: string;
    recipient_name?: string;
    subject_line: string;
    text_content: string;
    html_content?: string;
    job_id?: string;
    invoice_id?: string;
    context_type?: string;
    context_data?: any;
    variables?: Record<string, any>;
  }): Promise<{ success: boolean; email_id: string; error?: string }> {
    try {
      // If template_id is provided, process the template
      let processedContent: {
        subject_line: string;
        text_content: string;
        html_content?: string;
      } = {
        subject_line: emailData.subject_line,
        text_content: emailData.text_content,
        html_content: emailData.html_content,
      };

      if (emailData.template_id && emailData.variables) {
        processedContent = await this.processTemplate(
          emailData.template_id,
          emailData.variables
        );
      }

      // Record email in history
      const { data: emailRecord, error: historyError } = await supabase
        .from('email_history')
        .insert([
          {
            template_id: emailData.template_id,
            contractor_id: emailData.contractor_id,
            recipient_email: emailData.recipient_email,
            recipient_name: emailData.recipient_name,
            subject_line: processedContent.subject_line,
            text_content: processedContent.text_content,
            html_content: processedContent.html_content,
            job_id: emailData.job_id,
            invoice_id: emailData.invoice_id,
            context_type: emailData.context_type || 'manual',
            context_data: emailData.context_data || {},
            status: 'sent',
            send_attempts: 1,
            open_count: 0,
            click_count: 0,
            device_info: {},
            location_info: {},
          },
        ])
        .select()
        .single();

      if (historyError) throw historyError;

      // Update template usage count
      if (emailData.template_id) {
        await supabase
          .from('email_templates')
          .update({
            times_used: supabase.raw('times_used + 1'),
            last_used: new Date().toISOString(),
          })
          .eq('id', emailData.template_id);
      }

      // In a real implementation, you would integrate with an email service provider
      // like SendGrid, Mailgun, or AWS SES to actually send the email

      // For now, we'll simulate successful sending
      return {
        success: true,
        email_id: emailRecord.id,
      };
    } catch (error) {
      logger.error('Error sending email:', error);
      return {
        success: false,
        email_id: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getEmailHistory(
    contractorId: string,
    limit: number = 50
  ): Promise<EmailHistory[]> {
    try {
      const { data, error } = await supabase
        .from('email_history')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching email history:', error);
      throw error;
    }
  }

  // =====================================================
  // EMAIL ANALYTICS
  // =====================================================

  static async getEmailAnalytics(
    contractorId: string,
    periodStart: string,
    periodEnd: string,
    templateId?: string
  ): Promise<EmailAnalytics | null> {
    try {
      let query = supabase
        .from('email_analytics')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd);

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching email analytics:', error);
      return null;
    }
  }

  static async generateAnalyticsReport(
    contractorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{
    summary: EmailAnalytics;
    by_template: (EmailAnalytics & { template_name: string })[];
    by_category: { category: string; metrics: EmailAnalytics }[];
  }> {
    try {
      // This would be implemented with more complex queries
      // For now, return a simplified version

      const { data: history, error } = await supabase
        .from('email_history')
        .select('*')
        .eq('contractor_id', contractorId)
        .gte('sent_at', periodStart)
        .lte('sent_at', periodEnd);

      if (error) throw error;

      // Calculate basic metrics
      const totalSent = history?.length || 0;
      const delivered =
        history?.filter((h: any) => h.status === 'delivered').length || 0;
      const opened = history?.filter((h: any) => h.open_count > 0).length || 0;
      const clicked =
        history?.filter((h: any) => h.click_count > 0).length || 0;
      const bounced =
        history?.filter((h: any) => h.status === 'bounced').length || 0;

      const summary: EmailAnalytics = {
        id: '',
        contractor_id: contractorId,
        period_start: periodStart,
        period_end: periodEnd,
        emails_sent: totalSent,
        emails_delivered: delivered,
        emails_bounced: bounced,
        emails_failed: 0,
        unique_opens: opened,
        total_opens:
          history?.reduce((sum: number, h: any) => sum + h.open_count, 0) || 0,
        unique_clicks: clicked,
        total_clicks:
          history?.reduce((sum: number, h: any) => sum + h.click_count, 0) || 0,
        unsubscribes: 0,
        complaints: 0,
        delivery_rate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
        open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
        click_rate: opened > 0 ? (clicked / opened) * 100 : 0,
        bounce_rate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
        unsubscribe_rate: 0,
        leads_generated: 0,
        jobs_booked: 0,
        revenue_generated: 0,
        created_at: new Date().toISOString(),
      };

      return {
        summary,
        by_template: [],
        by_category: [],
      };
    } catch (error) {
      logger.error('Error generating analytics report:', error);
      throw error;
    }
  }

  // =====================================================
  // TEMPLATE UTILITIES
  // =====================================================

  static async duplicateTemplate(
    templateId: string,
    newName: string
  ): Promise<EmailTemplate> {
    try {
      const original = await this.getTemplate(templateId);
      if (!original) {
        throw new Error('Original template not found');
      }

      const { data, error } = await supabase
        .from('email_templates')
        .insert([
          {
            contractor_id: original.contractor_id,
            template_name: newName,
            template_category: original.template_category,
            template_type: original.template_type,
            subject_line: original.subject_line,
            html_content: original.html_content,
            text_content: original.text_content,
            preview_text: original.preview_text,
            description: `Copy of ${original.description || original.template_name}`,
            is_active: true,
            is_default: false,
            language_code: original.language_code,
            variables: original.variables,
            required_variables: original.required_variables,
            brand_colors: original.brand_colors,
            logo_url: original.logo_url,
            company_signature: original.company_signature,
            footer_content: original.footer_content,
            times_used: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error duplicating template:', error);
      throw error;
    }
  }

  static validateTemplate(template: Partial<EmailTemplate>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!template.template_name || template.template_name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.subject_line || template.subject_line.trim().length === 0) {
      errors.push('Subject line is required');
    }

    if (!template.text_content || template.text_content.trim().length === 0) {
      errors.push('Text content is required');
    }

    if (template.subject_line && template.subject_line.length > 200) {
      errors.push('Subject line should be under 200 characters');
    }

    if (template.preview_text && template.preview_text.length > 150) {
      errors.push('Preview text should be under 150 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static extractVariablesFromContent(content: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }
}
