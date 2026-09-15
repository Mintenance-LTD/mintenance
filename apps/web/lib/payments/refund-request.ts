/** Browser-only persistence for an unresolved user refund action. No provider secrets. */
export interface RefundRequestBody {
  jobId: string;
  escrowTransactionId: string;
  amount?: number;
  reason: string;
}
interface PendingRefund {
  key: string;
  body: RefundRequestBody;
}
const storageKey = (actorId: string, escrowId: string) =>
  `mintenance:pending-refund:${actorId}:${escrowId}`;
export function readPendingRefund(
  actorId: string,
  escrowId: string
): PendingRefund | null {
  const raw = window.localStorage.getItem(storageKey(actorId, escrowId));
  if (!raw) return null;
  const saved = JSON.parse(raw) as PendingRefund;
  if (
    !saved.key ||
    !saved.body ||
    saved.body.escrowTransactionId !== escrowId
  ) {
    throw new Error(
      'The saved refund request could not be recovered. Contact support before retrying.'
    );
  }
  return saved;
}
export async function submitRefund(
  actorId: string,
  body: RefundRequestBody,
  csrfToken: string
) {
  if (!actorId || !body.jobId || !body.escrowTransactionId)
    throw new Error('Refund payment identity is missing');
  const slot = storageKey(actorId, body.escrowTransactionId);
  const existing = readPendingRefund(actorId, body.escrowTransactionId);
  const samePayload = (a: RefundRequestBody, b: RefundRequestBody) =>
    a.jobId === b.jobId &&
    a.escrowTransactionId === b.escrowTransactionId &&
    a.amount === b.amount &&
    a.reason === b.reason;
  if (existing && !samePayload(existing.body, body)) {
    throw new Error(
      'A previous refund still needs confirmation. Reopen this form to retry its saved amount and reason.'
    );
  }
  const pending = existing ?? { key: crypto.randomUUID(), body };
  // Persist before sending. If storage is unavailable, do not risk a request
  // whose identity would be lost on refresh or an interrupted connection.
  window.localStorage.setItem(slot, JSON.stringify(pending));
  const response = await fetch('/api/payments/refund', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Idempotency-Key': pending.key,
    },
    body: JSON.stringify(pending.body),
  });
  const result = await response.json();
  const confirmed =
    response.ok &&
    result.success === true &&
    result.status === 'succeeded' &&
    ['amount', 'remainingAmount', 'cashAmount', 'creditReturned'].every(
      (field) =>
        typeof result[field] === 'number' &&
        Number.isFinite(result[field]) &&
        result[field] >= 0
    );
  const terminal =
    confirmed || result.status === 'failed' || result.status === 'canceled';
  // The response must identify an operation before it can retire the saved
  // action. A validation/network error never gives permission to use a new key.
  if (
    result.operationId &&
    terminal &&
    readPendingRefund(actorId, body.escrowTransactionId)?.key === pending.key
  ) {
    window.localStorage.removeItem(slot);
  }
  if (!confirmed || !result.operationId) {
    throw new Error(
      typeof result.error === 'string'
        ? result.error
        : 'Refund is not confirmed. Retry to check the same request.'
    );
  }
  return result as {
    success: true;
    operationId: string;
    refundId: string;
    amount: number;
    remainingAmount: number;
    cashAmount: number;
    creditReturned: number;
    status: 'succeeded';
  };
}
