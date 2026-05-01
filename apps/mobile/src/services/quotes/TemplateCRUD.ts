import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type {
  QuoteTemplate,
  QuoteLineItemTemplate,
  CreateQuoteTemplateData,
} from './types';

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
          description: item.item_description,
          quantity: item.default_quantity,
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
    logger.error('Error creating quote template', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to create quote template');
  }
}

export async function getQuoteTemplates(
  contractorId: string
): Promise<QuoteTemplate[]> {
  try {
    const response = await mobileApiClient.get<{ templates: QuoteTemplate[] }>(
      '/api/contractor/quote-templates'
    );

    return response.templates || [];
  } catch (error) {
    logger.error('Error fetching quote templates', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to fetch quote templates');
  }
}

/**
 * 2026-05-01 audit follow-up: `quote_templates` and
 * `quote_line_item_templates` were never created in production.
 * Single-template fetch is implemented as a client-side filter over
 * `getQuoteTemplates` (which IS API-routed), so we avoid adding a
 * new endpoint just for the by-id case.
 */
export async function getQuoteTemplate(
  templateId: string
): Promise<QuoteTemplate | null> {
  try {
    const all = await getQuoteTemplates('');
    return all.find((t) => t.id === templateId) ?? null;
  } catch (error) {
    logger.error('Error fetching quote template', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to fetch quote template');
  }
}

export async function getQuoteTemplateLineItems(
  templateId: string
): Promise<QuoteLineItemTemplate[]> {
  try {
    // Line items are embedded in the template itself (JSONB on the
    // template row); the dedicated `quote_line_item_templates` table
    // never shipped. Project them out of the parent template.
    const template = await getQuoteTemplate(templateId);
    return (
      (template as unknown as { line_items?: QuoteLineItemTemplate[] })
        ?.line_items ?? []
    );
  } catch (error) {
    logger.error('Error fetching template line items', error, {
      service: 'quote-builder',
    });
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
    logger.error('Error updating quote template', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to update quote template');
  }
}

export async function deleteQuoteTemplate(templateId: string): Promise<void> {
  try {
    await mobileApiClient.delete(
      `/api/contractor/quote-templates/${templateId}`
    );
  } catch (error) {
    logger.error('Error deleting quote template', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to delete quote template');
  }
}
