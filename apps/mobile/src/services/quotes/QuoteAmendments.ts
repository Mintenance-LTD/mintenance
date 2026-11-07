import { mobileApiClient } from '../../utils/mobileApiClient';
import { queryClient } from '../../lib/queryClient';
export type AmendmentPricing = {
  line_items?: {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    unit_price?: number;
    total?: number;
  }[];
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  terms?: string;
};
export type QuoteAmendment = {
  id: string;
  version: number;
  sequence: number;
  status: string;
  reason: string;
  before_snapshot: AmendmentPricing;
  after_snapshot: AmendmentPricing;
  events: {
    version: number;
    action: string;
    note: string;
    created_at: string;
  }[];
};
export type AmendmentPage = {
  amendments: QuoteAmendment[];
  can_approve: boolean;
  is_contractor: boolean;
  next_before: number | null;
};
export type AmendmentDecision = {
  action: 'approve' | 'reject' | 'withdraw' | 'apply';
  expected_version: number;
  confirmed: true;
  note: string;
};
export async function getQuoteAmendments(
  jobId: string,
  before?: number
): Promise<AmendmentPage> {
  const page = await mobileApiClient.get<AmendmentPage>(
    `/api/jobs/${encodeURIComponent(jobId)}/quote-amendments${before ? `?before=${before}` : ''}`
  );
  if (
    !page ||
    !Array.isArray(page.amendments) ||
    page.amendments.some(
      (item) =>
        !item ||
        typeof item.id !== 'string' ||
        !Number.isSafeInteger(item.version) ||
        item.version < 1 ||
        !item.before_snapshot ||
        !item.after_snapshot ||
        !Array.isArray(item.events) ||
        (item.before_snapshot.line_items != null &&
          !Array.isArray(item.before_snapshot.line_items)) ||
        (item.after_snapshot.line_items != null &&
          !Array.isArray(item.after_snapshot.line_items))
    ) ||
    typeof page.can_approve !== 'boolean' ||
    typeof page.is_contractor !== 'boolean' ||
    (page.next_before !== null &&
      (!Number.isSafeInteger(page.next_before) ||
        page.next_before < 1 ||
        (before !== undefined && page.next_before >= before)))
  ) {
    throw new Error('Could not read amendment review. Try again.');
  }
  return page;
}
export async function decideQuoteAmendment(
  jobId: string,
  id: string,
  decision: AmendmentDecision
) {
  const result = await mobileApiClient.post<{
    amendment: { id: string; status: string };
    warning?: string;
  }>(
    `/api/jobs/${encodeURIComponent(jobId)}/quote-amendments/${encodeURIComponent(id)}`,
    decision
  );
  if (
    result?.amendment?.id !== id ||
    result.amendment.status !==
      (
        {
          approve: 'approved',
          reject: 'rejected',
          withdraw: 'withdrawn',
          apply: 'applied',
        } as const
      )[decision.action]
  ) {
    throw new Error(
      'Could not confirm the outcome. Retry the same decision or refresh the review.'
    );
  }
  if (result.amendment.status === 'applied') {
    // Refresh mounted job/bid readers and mark persisted inactive prices stale.
    // Cache failures must never turn a confirmed application into a failed save.
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['jobs'],
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: ['contractor', 'my-bid', jobId],
          refetchType: 'active',
        }),
      ]);
    } catch {
      result.warning = [
        result.warning,
        'Pricing was applied. Refresh job details to check the latest amounts.',
      ]
        .filter(Boolean)
        .join(' ');
    }
  }
  return result;
}
