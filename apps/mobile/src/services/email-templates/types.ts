export interface EmailTemplate {
  id: string;
  contractor_id: string;
  template_name: string;
  template_category:
    | 'invoice' | 'quote' | 'reminder' | 'confirmation' | 'follow_up'
    | 'welcome' | 'completion' | 'marketing' | 'appointment' | 'custom';
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
  brand_colors: { primary?: string; secondary?: string };
  logo_url?: string;
  company_signature?: string;
  footer_content?: string;
  auto_send_trigger?: string;
  auto_send_delay_hours: number;
  auto_send_conditions: unknown;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  id: string;
  variable_name: string;
  variable_category: 'client' | 'contractor' | 'job' | 'invoice' | 'payment' | 'company' | 'system';
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
  context_data: unknown;
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
  device_info: unknown;
  location_info: unknown;
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
