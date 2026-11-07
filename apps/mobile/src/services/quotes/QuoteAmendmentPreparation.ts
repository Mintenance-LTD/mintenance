import { mobileApiClient } from '../../utils/mobileApiClient';
import {
  calculateDraftQuotePricing,
  type DraftQuotePricing,
} from '@mintenance/shared';
import type { QuoteRevision } from './types';

export type AmendmentSource = {
  quote: {
    id: string;
    title: string;
    status: string;
    job_id: string | null;
    updated_at: string | null;
    total_amount: number | null;
    line_items:
      | {
          description?: string;
          item_name?: string;
          quantity?: number;
          unitPrice?: number;
          unit_price?: number;
        }[]
      | null;
    terms: string | null;
  };
  is_current: boolean;
};
export type AmendmentProposalInput = {
  request_id: string;
  expected_updated_at: string | null;
  reason: string;
  pricing: DraftQuotePricing;
};
export async function getAmendmentSource(id: string): Promise<AmendmentSource> {
  const result = await mobileApiClient.get<AmendmentSource>(
    `/api/contractor/quotes/${encodeURIComponent(id)}/amendment-context`
  );
  if (
    result?.quote?.id !== id ||
    typeof result.is_current !== 'boolean' ||
    typeof result.quote.status !== 'string' ||
    (result.quote.updated_at !== null &&
      (typeof result.quote.updated_at !== 'string' ||
        !Number.isFinite(Date.parse(result.quote.updated_at)))) ||
    (result.quote.line_items !== null &&
      (!Array.isArray(result.quote.line_items) ||
        result.quote.line_items.some(
          (item) => !item || typeof item !== 'object'
        )))
  )
    throw new Error('Could not read amendment source. Reload before editing.');
  return result;
}
export async function getAmendmentHistory(id: string, before?: number) {
  const page = await mobileApiClient.get<{
    revisions: QuoteRevision[];
    next_before: number | null;
  }>(
    `/api/contractor/quotes/${encodeURIComponent(id)}/revisions${before ? `?before=${before}` : ''}`
  );
  if (
    !page ||
    !Array.isArray(page.revisions) ||
    page.revisions.some(
      (r) => !r || r.quote_id !== id || typeof r.id !== 'string'
    ) ||
    (page.next_before !== null &&
      (!Number.isSafeInteger(page.next_before) ||
        page.next_before < 1 ||
        (before !== undefined && page.next_before >= before)))
  )
    throw new Error('Could not read amendment history. Try again.');
  return page;
}
export async function prepareQuoteAmendment(
  id: string,
  input: AmendmentProposalInput
) {
  calculateDraftQuotePricing(input.pricing);
  const result = await mobileApiClient.post<{ revision: QuoteRevision }>(
    `/api/contractor/quotes/${encodeURIComponent(id)}/revisions`,
    input
  );
  if (
    !result?.revision?.id ||
    result.revision.quote_id !== id ||
    result.revision.kind !== 'amendment_proposed' ||
    !result.revision.before_snapshot ||
    !result.revision.after_snapshot
  )
    throw new Error(
      'Could not confirm the saved proposal. Retry the same request or reload history.'
    );
  return result.revision;
}
export async function publishQuoteAmendment(jobId: string, id: string) {
  const result = await mobileApiClient.post<{
    amendment: { id: string; status: string };
  }>(
    `/api/jobs/${encodeURIComponent(jobId)}/quote-amendments/${encodeURIComponent(id)}`,
    { action: 'publish', expected_version: 0, confirmed: true }
  );
  if (result?.amendment?.id !== id || result.amendment.status !== 'published')
    throw new Error(
      'Could not confirm publication. Retry or refresh customer review.'
    );
  return result.amendment;
}
