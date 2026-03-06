import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { QuoteRevision } from './types';

export async function getQuoteRevisions(quoteId: string): Promise<QuoteRevision[]> {
  try {
    const { data, error } = await supabase
      .from('quote_revisions')
      .select('*')
      .eq('quote_id', quoteId)
      .order('revision_number', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching quote revisions', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quote revisions');
  }
}

export async function createQuoteRevision(
  quoteId: string,
  changesSummary: string,
  previousTotal: number,
  newTotal: number,
  revisedBy: string
): Promise<QuoteRevision> {
  try {
    const revisions = await getQuoteRevisions(quoteId);
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
    logger.error('Error creating quote revision', error, { service: 'quote-builder' });
    throw new Error('Failed to create quote revision');
  }
}
