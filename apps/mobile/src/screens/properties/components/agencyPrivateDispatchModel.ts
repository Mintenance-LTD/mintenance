import type { TicketStatus } from './portfolioInboxModel';

export type AgencyPrivateWorkViewer = 'landlord' | 'contractor';
export type DispatchViewer = AgencyPrivateWorkViewer | 'staff';
export type DispatchAuthorization =
  | 'within_limit'
  | 'landlord_approved'
  | 'approval_required'
  | 'no_landlord'
  | 'no_quote';

export type PrivateDispatch = {
  viewer: DispatchViewer;
  ticketId: string;
  title: string;
  ticketStatus: TicketStatus;
  revision: number;
  quoteVersion: number | null;
  quotePence: number | null;
  quoteScope: string | null;
  approvalLimitPence: number | null;
  decision: 'approved' | 'rejected' | null;
  authorization: DispatchAuthorization | null;
  contractorId: string | null;
  dispatchedAt: string | null;
  acceptedAt: string | null;
};

export type DispatchResponse = { dispatch: PrivateDispatch | null };
export type DispatchAction = 'approve' | 'reject' | 'accept';
export const privateWorkPath = '/api/agency-work';
export const privateDispatchPath = (ticketId: string) =>
  '/api/portfolio/tickets/' +
  encodeURIComponent(ticketId) +
  '/private-dispatch';
export const privateWorkKey = (
  userId: string,
  viewer: AgencyPrivateWorkViewer
) => ['agency-private-work', userId, viewer] as const;
export const validTicketId = (id: string) =>
  /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id);

export function requireDispatchScope(
  result: DispatchResponse,
  ticketId: string,
  viewer: DispatchViewer
) {
  const value = result.dispatch;
  if (value && (value.ticketId !== ticketId || value.viewer !== viewer)) {
    throw Object.assign(new Error('Private work assignment not available'), {
      statusCode: 403,
    });
  }
  return value;
}

export function isClosedRepair(value: PrivateDispatch) {
  return value.ticketStatus === 'closed' || value.ticketStatus === 'resolved';
}

export function availableActions(value: PrivateDispatch): DispatchAction[] {
  if (
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    value.quoteVersion === null ||
    !Number.isSafeInteger(value.quoteVersion) ||
    value.quoteVersion < 1
  )
    return [];
  if (isClosedRepair(value) || value.quotePence == null || !value.quoteScope)
    return [];
  if (value.viewer === 'landlord' && !value.decision && !value.dispatchedAt)
    return ['approve', 'reject'];
  if (value.viewer === 'contractor' && value.dispatchedAt && !value.acceptedAt)
    return ['accept'];
  return [];
}
