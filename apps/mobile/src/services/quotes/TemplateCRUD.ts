import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { QuoteTemplate, QuoteLineItemTemplate, CreateQuoteTemplateData } from './types';

export async function createQuoteTemplate(
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
    logger.error('Error creating quote template', error, { service: 'quote-builder' });
    throw new Error('Failed to create quote template');
  }
}

export async function getQuoteTemplates(contractorId: string): Promise<QuoteTemplate[]> {
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
    logger.error('Error updating quote template', error, { service: 'quote-builder' });
    throw new Error('Failed to update quote template');
  }
}

export async function deleteQuoteTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('quote_templates')
      .update({ is_active: false })
      .eq('id', templateId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error deleting quote template', error, { service: 'quote-builder' });
    throw new Error('Failed to delete quote template');
  }
}
