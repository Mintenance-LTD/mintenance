import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { QuoteTemplate, QuoteLineItemTemplate, CreateQuoteTemplateData } from './types';

export async function createQuoteTemplate(
  contractorId: string,
  templateData: CreateQuoteTemplateData
): Promise<QuoteTemplate> {
  try {
    const response = await mobileApiClient.post<{ template: QuoteTemplate }>(
      '/api/contractor/quote-templates',
      {
        name: templateData.template_name,
        description: templateData.description,
        line_items: templateData.line_items?.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit,
          category: item.category,
        })),
        terms: templateData.terms_and_conditions,
        notes: null,
      }
    );

    return response.template;
  } catch (error) {
    logger.error('Error creating quote template', error, { service: 'quote-builder' });
    throw new Error('Failed to create quote template');
  }
}

export async function getQuoteTemplates(contractorId: string): Promise<QuoteTemplate[]> {
  try {
    const response = await mobileApiClient.get<{ templates: QuoteTemplate[] }>(
      '/api/contractor/quote-templates'
    );

    return response.templates || [];
  } catch (error) {
    logger.error('Error fetching quote templates', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quote templates');
  }
}

export async function getQuoteTemplate(templateId: string): Promise<QuoteTemplate | null> {
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
    logger.error('Error fetching quote template', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quote template');
  }
}

export async function getQuoteTemplateLineItems(templateId: string): Promise<QuoteLineItemTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('quote_line_item_templates')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching template line items', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch template line items');
  }
}

export async function updateQuoteTemplate(
  templateId: string,
  templateData: Partial<CreateQuoteTemplateData>
): Promise<QuoteTemplate> {
  try {
    const response = await mobileApiClient.put<{ template: QuoteTemplate }>(
      `/api/contractor/quote-templates/${templateId}`,
      {
        name: templateData.template_name,
        description: templateData.description,
        terms: templateData.terms_and_conditions,
        notes: null,
      }
    );

    return response.template;
  } catch (error) {
    logger.error('Error updating quote template', error, { service: 'quote-builder' });
    throw new Error('Failed to update quote template');
  }
}

export async function deleteQuoteTemplate(templateId: string): Promise<void> {
  try {
    await mobileApiClient.delete(`/api/contractor/quote-templates/${templateId}`);
  } catch (error) {
    logger.error('Error deleting quote template', error, { service: 'quote-builder' });
    throw new Error('Failed to delete quote template');
  }
}
