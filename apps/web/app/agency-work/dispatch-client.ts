import { getCsrfHeaders } from '@/lib/csrf-client';

export type DispatchViewer = 'staff' | 'landlord' | 'contractor';
export type Authorization =
  | 'within_limit'
  | 'landlord_approved'
  | 'approval_required'
  | 'no_landlord'
  | 'no_quote';
export type Dispatch = {
  viewer: DispatchViewer;
  ticketId: string;
  ticketStatus?: string;
  title: string;
  revision: number;
  quoteVersion: number | null;
  quotePence: number | null;
  quoteScope: string | null;
  approvalLimitPence: number | null;
  decision: 'approved' | 'rejected' | null;
  authorization: Authorization | null;
  contractorId: string | null;
  dispatchedAt: string | null;
  acceptedAt: string | null;
};

export class DispatchRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function dispatchEndpoint(ticketId: string) {
  return (
    '/api/portfolio/tickets/' +
    encodeURIComponent(ticketId) +
    '/private-dispatch'
  );
}

export async function agencyRequest<T>(
  url: string,
  options: {
    signal?: AbortSignal;
    action?: Record<string, unknown>;
    method?: 'POST' | 'PUT';
  } = {}
): Promise<T> {
  const request = options.action
    ? {
        method: options.method ?? 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify(options.action),
      }
    : {};
  const response = await fetch(url, {
    ...request,
    cache: 'no-store',
    signal: options.signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const detail =
      typeof result?.error?.message === 'string'
        ? result.error.message
        : typeof result?.message === 'string'
          ? result.message
          : null;
    const message =
      [400, 401, 402, 403, 404, 409, 422, 429].includes(response.status) &&
      detail
        ? detail
        : response.status === 409
          ? 'This work order changed. Reload to see the latest quote before continuing.'
          : 'Could not complete this action. Try again.';
    throw new DispatchRequestError(response.status, message);
  }
  return result as T;
}

export function isClosed(order: Dispatch) {
  return order.ticketStatus === 'resolved' || order.ticketStatus === 'closed';
}

export function canAssign(order: Dispatch) {
  return (
    !isClosed(order) &&
    order.quoteVersion != null &&
    !order.dispatchedAt &&
    order.decision !== 'rejected' &&
    (order.authorization === 'within_limit' ||
      order.authorization === 'landlord_approved')
  );
}
