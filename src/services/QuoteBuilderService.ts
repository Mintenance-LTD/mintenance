import { supabase } from '../config/supabase';
import { Database } from '../types/database';

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
  interaction_details?: any;
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
  line_items?: Omit<
    QuoteLineItemTemplate,
    'id' | 'template_id' | 'created_at'
  >[];
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
  line_items: Omit<
    QuoteLineItem,
    'id' | 'quote_id' | 'subtotal' | 'created_at'
  >[];
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
  date_range?: {
    start: string;
    end: string;
  };
  amount_range?: {
    min: number;
    max: number;
  };
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

export class QuoteBuilderService {
  static async createQuoteTemplate(
    contractorId: string,
    templateData: CreateQuoteTemplateData
  ): Promise<QuoteTemplate> {
    try {
      const { data: template, error: templateError } = await supabase
        .from('quote_templates')
        .insert({
          contractor_id: contractorId,
          template_name: templateData.template_name,
          description: templateData.description,
          default_markup_percentage: templateData.default_markup_percentage,
          default_discount_percentage: templateData.default_discount_percentage,
          terms_and_conditions: templateData.terms_and_conditions,
          is_active: true,
          usage_count: 0,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      if (templateData.line_items && templateData.line_items.length > 0) {
        const lineItems = templateData.line_items.map((item, index) => ({
          template_id: template.id,
          ...item,
          sort_order: index + 1,
        }));

        const { error: lineItemsError } = await supabase
          .from('quote_line_item_templates')
          .insert(lineItems);

        if (lineItemsError) throw lineItemsError;
      }

      return template;
    } catch (error) {
      console.error('Error creating quote template:', error);
      throw new Error('Failed to create quote template');
    }
  }

  static async getQuoteTemplates(
    contractorId: string
  ): Promise<QuoteTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching quote templates:', error);
      throw new Error('Failed to fetch quote templates');
    }
  }

  static async getQuoteTemplate(
    templateId: string
  ): Promise<QuoteTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching quote template:', error);
      throw new Error('Failed to fetch quote template');
    }
  }

  static async getQuoteTemplateLineItems(
    templateId: string
  ): Promise<QuoteLineItemTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('quote_line_item_templates')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching template line items:', error);
      throw new Error('Failed to fetch template line items');
    }
  }

  static async updateQuoteTemplate(
    templateId: string,
    templateData: Partial<CreateQuoteTemplateData>
  ): Promise<QuoteTemplate> {
    try {
      const { data, error } = await supabase
        .from('quote_templates')
        .update({
          template_name: templateData.template_name,
          description: templateData.description,
          default_markup_percentage: templateData.default_markup_percentage,
          default_discount_percentage: templateData.default_discount_percentage,
          terms_and_conditions: templateData.terms_and_conditions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating quote template:', error);
      throw new Error('Failed to update quote template');
    }
  }

  static async deleteQuoteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('quote_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting quote template:', error);
      throw new Error('Failed to delete quote template');
    }
  }

  static async createQuote(
    contractorId: string,
    quoteData: CreateQuoteData
  ): Promise<ContractorQuote> {
    try {
      let subtotal = 0;
      const lineItems = quoteData.line_items.map((item) => {
        const itemSubtotal = item.quantity * item.unit_price;
        subtotal += itemSubtotal;
        return {
          ...item,
          subtotal: itemSubtotal,
        };
      });

      const markup = (quoteData.markup_percentage || 0) / 100;
      const discount = (quoteData.discount_percentage || 0) / 100;
      const taxRate = quoteData.tax_rate || 0.2;

      const subtotalAfterMarkup = subtotal * (1 + markup);
      const discountAmount = subtotalAfterMarkup * discount;
      const taxableAmount = subtotalAfterMarkup - discountAmount;
      const taxAmount = taxableAmount * taxRate;
      const totalAmount = taxableAmount + taxAmount;

      const { data: quote, error: quoteError } = await supabase
        .from('contractor_quotes')
        .insert({
          contractor_id: contractorId,
          job_id: quoteData.job_id,
          client_name: quoteData.client_name,
          client_email: quoteData.client_email,
          client_phone: quoteData.client_phone,
          project_title: quoteData.project_title,
          project_description: quoteData.project_description,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          markup_percentage: quoteData.markup_percentage,
          discount_percentage: quoteData.discount_percentage,
          tax_rate: taxRate,
          currency: 'GBP',
          status: 'draft',
          valid_until: quoteData.valid_until,
          terms_and_conditions: quoteData.terms_and_conditions,
          notes: quoteData.notes,
          template_id: quoteData.template_id,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const quoteLineItems = lineItems.map((item, index) => ({
        quote_id: quote.id,
        item_name: item.item_name,
        item_description: item.item_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit,
        subtotal: item.subtotal,
        category: item.category,
        is_taxable: item.is_taxable,
        sort_order: index + 1,
      }));

      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(quoteLineItems);

      if (lineItemsError) throw lineItemsError;

      if (quoteData.template_id) {
        await supabase
          .from('quote_templates')
          .update({ usage_count: supabase.raw('usage_count + 1') })
          .eq('id', quoteData.template_id);
      }

      const { error: analyticsError } = await supabase
        .from('quote_analytics')
        .insert({
          contractor_id: contractorId,
          quote_id: quote.id,
          view_count: 0,
          download_count: 0,
          share_count: 0,
          client_engagement_score: 0,
        });

      if (analyticsError)
        console.warn('Failed to create quote analytics:', analyticsError);

      return quote;
    } catch (error) {
      console.error('Error creating quote:', error);
      throw new Error('Failed to create quote');
    }
  }

  static async getQuotes(
    contractorId: string,
    filters?: QuoteFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<ContractorQuote[]> {
    try {
      let query = supabase
        .from('contractor_quotes')
        .select('*')
        .eq('contractor_id', contractorId);

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.template_id) {
        query = query.eq('template_id', filters.template_id);
      }

      if (filters?.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }

      if (filters?.amount_range) {
        query = query
          .gte('total_amount', filters.amount_range.min)
          .lte('total_amount', filters.amount_range.max);
      }

      if (filters?.client_search) {
        query = query.ilike('client_name', `%${filters.client_search}%`);
      }

      if (filters?.project_search) {
        query = query.ilike('project_title', `%${filters.project_search}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching quotes:', error);
      throw new Error('Failed to fetch quotes');
    }
  }

  static async getQuote(quoteId: string): Promise<ContractorQuote | null> {
    try {
      const { data, error } = await supabase
        .from('contractor_quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching quote:', error);
      throw new Error('Failed to fetch quote');
    }
  }

  static async getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]> {
    try {
      const { data, error } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching quote line items:', error);
      throw new Error('Failed to fetch quote line items');
    }
  }

  static async updateQuote(
    quoteId: string,
    quoteData: UpdateQuoteData
  ): Promise<ContractorQuote> {
    try {
      const { data, error } = await supabase
        .from('contractor_quotes')
        .update({
          ...quoteData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      if (quoteData.status) {
        await this.trackQuoteInteraction(quoteId, 'shared', {
          new_status: quoteData.status,
          timestamp: new Date().toISOString(),
        });
      }

      return data;
    } catch (error) {
      console.error('Error updating quote:', error);
      throw new Error('Failed to update quote');
    }
  }

  static async sendQuote(quoteId: string): Promise<ContractorQuote> {
    try {
      const { data, error } = await supabase
        .from('contractor_quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      await this.trackQuoteInteraction(quoteId, 'sent');

      return data;
    } catch (error) {
      console.error('Error sending quote:', error);
      throw new Error('Failed to send quote');
    }
  }

  static async duplicateQuote(quoteId: string): Promise<ContractorQuote> {
    try {
      const originalQuote = await this.getQuote(quoteId);
      if (!originalQuote) throw new Error('Quote not found');

      const lineItems = await this.getQuoteLineItems(quoteId);

      const duplicateData: CreateQuoteData = {
        client_name: `${originalQuote.client_name} (Copy)`,
        client_email: originalQuote.client_email,
        client_phone: originalQuote.client_phone,
        project_title: `${originalQuote.project_title} (Copy)`,
        project_description: originalQuote.project_description,
        job_id: originalQuote.job_id,
        template_id: originalQuote.template_id,
        markup_percentage: originalQuote.markup_percentage,
        discount_percentage: originalQuote.discount_percentage,
        tax_rate: originalQuote.tax_rate,
        terms_and_conditions: originalQuote.terms_and_conditions,
        notes: originalQuote.notes,
        line_items: lineItems.map((item) => ({
          item_name: item.item_name,
          item_description: item.item_description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit,
          category: item.category,
          is_taxable: item.is_taxable,
          sort_order: item.sort_order,
        })),
      };

      return await this.createQuote(originalQuote.contractor_id, duplicateData);
    } catch (error) {
      console.error('Error duplicating quote:', error);
      throw new Error('Failed to duplicate quote');
    }
  }

  static async deleteQuote(quoteId: string): Promise<void> {
    try {
      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', quoteId);

      if (lineItemsError) throw lineItemsError;

      const { error: quoteError } = await supabase
        .from('contractor_quotes')
        .delete()
        .eq('id', quoteId);

      if (quoteError) throw quoteError;
    } catch (error) {
      console.error('Error deleting quote:', error);
      throw new Error('Failed to delete quote');
    }
  }

  static async getQuoteSummaryStats(
    contractorId: string
  ): Promise<QuoteSummaryStats> {
    try {
      const { data, error } = await supabase
        .from('contractor_quotes')
        .select('status, total_amount')
        .eq('contractor_id', contractorId);

      if (error) throw error;

      const quotes = data || [];
      const totalQuotes = quotes.length;
      const draftQuotes = quotes.filter(
        (q: any) => q.status === 'draft'
      ).length;
      const sentQuotes = quotes.filter((q: any) => q.status === 'sent').length;
      const acceptedQuotes = quotes.filter(
        (q: any) => q.status === 'accepted'
      ).length;
      const rejectedQuotes = quotes.filter(
        (q: any) => q.status === 'rejected'
      ).length;

      const totalValue = quotes.reduce(
        (sum: number, q: any) => sum + (q.total_amount || 0),
        0
      );
      const acceptedValue = quotes
        .filter((q: any) => q.status === 'accepted')
        .reduce((sum: number, q: any) => sum + (q.total_amount || 0), 0);

      const averageQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;
      const acceptanceRate =
        sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0;
      const conversionRate =
        totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;

      return {
        total_quotes: totalQuotes,
        draft_quotes: draftQuotes,
        sent_quotes: sentQuotes,
        accepted_quotes: acceptedQuotes,
        rejected_quotes: rejectedQuotes,
        total_value: totalValue,
        accepted_value: acceptedValue,
        average_quote_value: averageQuoteValue,
        acceptance_rate: acceptanceRate,
        conversion_rate: conversionRate,
      };
    } catch (error) {
      console.error('Error fetching quote summary stats:', error);
      throw new Error('Failed to fetch quote summary stats');
    }
  }

  static async trackQuoteInteraction(
    quoteId: string,
    interactionType: QuoteInteraction['interaction_type'],
    details?: any
  ): Promise<void> {
    try {
      const { error } = await supabase.from('quote_interactions').insert({
        quote_id: quoteId,
        interaction_type: interactionType,
        interaction_details: details,
      });

      if (error) throw error;

      await supabase.rpc('update_quote_analytics_on_interaction', {
        p_quote_id: quoteId,
        p_interaction_type: interactionType,
      });
    } catch (error) {
      console.error('Error tracking quote interaction:', error);
    }
  }

  static async getQuoteAnalytics(
    quoteId: string
  ): Promise<QuoteAnalytics | null> {
    try {
      const { data, error } = await supabase
        .from('quote_analytics')
        .select('*')
        .eq('quote_id', quoteId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching quote analytics:', error);
      throw new Error('Failed to fetch quote analytics');
    }
  }

  static async getQuoteRevisions(quoteId: string): Promise<QuoteRevision[]> {
    try {
      const { data, error } = await supabase
        .from('quote_revisions')
        .select('*')
        .eq('quote_id', quoteId)
        .order('revision_number', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching quote revisions:', error);
      throw new Error('Failed to fetch quote revisions');
    }
  }

  static async createQuoteRevision(
    quoteId: string,
    changesSummary: string,
    previousTotal: number,
    newTotal: number,
    revisedBy: string
  ): Promise<QuoteRevision> {
    try {
      const revisions = await this.getQuoteRevisions(quoteId);
      const nextRevisionNumber = revisions.length + 1;

      const { data, error } = await supabase
        .from('quote_revisions')
        .insert({
          quote_id: quoteId,
          revision_number: nextRevisionNumber,
          changes_summary: changesSummary,
          previous_total: previousTotal,
          new_total: newTotal,
          revised_by: revisedBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating quote revision:', error);
      throw new Error('Failed to create quote revision');
    }
  }

  static async generateQuotePDF(quoteId: string): Promise<string> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) throw new Error('Quote not found');

      const lineItems = await this.getQuoteLineItems(quoteId);

      await this.trackQuoteInteraction(quoteId, 'downloaded');

      return `Generated PDF for quote ${quote.quote_number}`;
    } catch (error) {
      console.error('Error generating quote PDF:', error);
      throw new Error('Failed to generate quote PDF');
    }
  }
}
