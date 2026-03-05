export interface QuoteTemplate {
  id: string;
  contractor_id: string;
  template_name: string;
  description?: string;
  default_markup_percentage?: number;
  default_discount_percentage?: number;
  terms_and_conditions?: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItemTemplate {
  id: string;
  template_id: string;
  item_name: string;
  item_description?: string;
  unit_price: number;
  unit: string;
  category: string;
  default_quantity?: number;
  is_taxable: boolean;
  sort_order: number;
  created_at: string;
}

export interface ContractorQuote {
  id: string;
  quote_number: string;
  contractor_id: string;
  job_id?: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  project_title: string;
  project_description?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount?: number;
  total_amount: number;
  markup_percentage?: number;
  discount_percentage?: number;
  tax_rate: number;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  valid_until?: string;
  terms_and_conditions?: string;
  notes?: string;
  template_id?: string;
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  item_name: string;
  item_description?: string;
  quantity: number;
  unit_price: number;
  unit: string;
  subtotal: number;
  category: string;
  is_taxable: boolean;
  sort_order: number;
  created_at: string;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  revision_number: number;
  changes_summary: string;
  previous_total: number;
  new_total: number;
  revised_by: string;
  created_at: string;
}

export interface QuoteInteraction {
  id: string;
  quote_id: string;
  interaction_type: 'sent' | 'viewed' | 'downloaded' | 'shared' | 'commented';
  interaction_details?: unknown;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface QuoteAnalytics {
  id: string;
  contractor_id: string;
  quote_id: string;
  view_count: number;
  download_count: number;
  share_count: number;
  time_to_first_view?: number;
  time_to_acceptance?: number;
  client_engagement_score: number;
  last_interaction_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteTemplateData {
  template_name: string;
  description?: string;
  default_markup_percentage?: number;
  default_discount_percentage?: number;
  terms_and_conditions?: string;
  line_items?: Omit<QuoteLineItemTemplate, 'id' | 'template_id' | 'created_at'>[];
}

export interface CreateQuoteData {
  client_name: string;
  client_email: string;
  client_phone?: string;
  project_title: string;
  project_description?: string;
  job_id?: string;
  template_id?: string;
  markup_percentage?: number;
  discount_percentage?: number;
  tax_rate?: number;
  valid_until?: string;
  terms_and_conditions?: string;
  notes?: string;
  line_items: Omit<QuoteLineItem, 'id' | 'quote_id' | 'subtotal' | 'created_at'>[];
}

export interface UpdateQuoteData {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  project_title?: string;
  project_description?: string;
  markup_percentage?: number;
  discount_percentage?: number;
  tax_rate?: number;
  valid_until?: string;
  terms_and_conditions?: string;
  notes?: string;
  status?: ContractorQuote['status'];
}

export interface QuoteFilters {
  status?: ContractorQuote['status'][];
  template_id?: string;
  date_range?: { start: string; end: string };
  amount_range?: { min: number; max: number };
  client_search?: string;
  project_search?: string;
}

export interface QuoteSummaryStats {
  total_quotes: number;
  draft_quotes: number;
  sent_quotes: number;
  accepted_quotes: number;
  rejected_quotes: number;
  total_value: number;
  accepted_value: number;
  average_quote_value: number;
  acceptance_rate: number;
  conversion_rate: number;
}
