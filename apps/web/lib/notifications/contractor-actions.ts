import {
  contractorPaymentHref,
  contractorStartHref,
} from '@/lib/contractor/payment-links';
import { disputeHref } from '@/lib/disputes/presentation';
import { isValidUUID } from '@/lib/validation/uuid';
import type { FeedNotification } from './feed';

const releaseTypes = new Set([
  'payment_released',
  'escrow_released',
  'escrow_auto_released',
]);
const disputeTypes = new Set([
  'dispute',
  'dispute_opened',
  'dispute_created',
  'dispute_filed',
  'escrow_disputed',
]);

function uuid(...values: unknown[]) {
  return values.find(
    (value): value is string => typeof value === 'string' && isValidUUID(value)
  );
}

export function contractorAlertTarget(row: FeedNotification) {
  const href = row.action_url ?? row.link ?? '';
  const metadata = row.metadata;
  const jobId = uuid(
    metadata?.jobId,
    metadata?.job_id,
    href.match(/^\/(?:contractor\/)?jobs\/([^/?#]+)(?:[/?#]|$)/)?.[1],
    href.match(/^\/contractor\/(?:bids?)\/([^/?#]+)\/details(?:[?#]|$)/)?.[1]
  );
  const escrowId = uuid(metadata?.escrowId, metadata?.escrow_id);
  const type = row.type.toLowerCase();

  if (
    disputeTypes.has(type) ||
    /^dispute (?:opened|created)\b/i.test(row.title)
  ) {
    return {
      kind: 'dispute' as const,
      jobId,
      escrowId: uuid(
        escrowId,
        href.match(/^\/disputes\/([^/?#]+)(?:[?#]|$)/)?.[1]
      ),
    };
  }
  if (
    releaseTypes.has(type) ||
    /^payment (?:auto-)?released\b/i.test(row.title)
  ) {
    return {
      kind: 'release' as const,
      jobId,
      escrowId: uuid(
        escrowId,
        metadata?.transactionId,
        href.match(/^\/(?:contractor\/)?payments\/([^/?#]+)(?:[?#]|$)/)?.[1]
      ),
    };
  }
  if (
    type === 'payment_secured' ||
    /(?:cleared to start|^payment secured)/i.test(row.title)
  ) {
    return { kind: 'funding' as const, jobId };
  }
  return null;
}

export function presentContractorAlert(
  row: FeedNotification,
  target: NonNullable<ReturnType<typeof contractorAlertTarget>>,
  caseHref?: string,
  releaseEscrowId?: string
) {
  const jobHref = target.jobId ? '/contractor/jobs/' + target.jobId : undefined;
  if (target.kind === 'funding') {
    const href = target.jobId ? contractorStartHref(target.jobId) : undefined;
    return {
      ...row,
      type: 'payment_secured',
      title: 'Payment secured — review start conditions',
      message:
        'The customer funded this job. Open the start checklist to see what is still required before you start.',
      action_url: href,
      link: href,
    };
  }
  const href =
    target.kind === 'dispute'
      ? (caseHref ??
        (target.escrowId && disputeHref(target.escrowId)) ??
        (jobHref && jobHref + '#payment-status'))
      : releaseEscrowId
        ? contractorPaymentHref(releaseEscrowId)
        : jobHref && jobHref + '#payment-status';
  return {
    ...row,
    type: target.kind === 'dispute' ? 'dispute_opened' : 'payment_released',
    ...(target.kind === 'release' && {
      message:
        'Mintenance recorded an escrow release. Check the payment for Stripe balance and bank payout status.',
    }),
    action_url: href,
    link: href,
  };
}
