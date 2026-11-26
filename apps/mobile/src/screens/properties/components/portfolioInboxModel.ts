export const ticketStatuses = [
  'open',
  'triaged',
  'in_progress',
  'blocked',
  'resolved',
  'closed',
] as const;
export const ticketPriorities = ['low', 'medium', 'high', 'urgent'] as const;
export const TICKET_LIMIT = 50;
export const PROPERTIES_PAGE_SIZE = 20;

export type TicketStatus = (typeof ticketStatuses)[number];
export type TicketPriority = (typeof ticketPriorities)[number];

export type PortfolioAccess = { allowed: boolean };
export type Workspace = { id: string; name: string; role: string };
export type InboxProperty = {
  id: string;
  property_name: string | null;
  address: string | null;
};

export type WorkspaceAccess = {
  workspaces: Workspace[];
  unlinkedProperties: InboxProperty[];
  canSetUp: boolean;
};

export type InboxProperties = {
  properties: InboxProperty[];
  pagination: { hasMore: boolean; totalPages: number };
};

export type Ticket = {
  id: string;
  org_id: string;
  property_id: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  sla_due_at: string | null;
  created_at: string;
};

export type TicketDetail = {
  ticket: Ticket;
  assessmentSource?: { id: string; href: string } | null;
  updates: {
    id: string;
    update_type: string;
    body: string | null;
    visibility: 'internal' | 'tenant_visible';
    created_at: string;
  }[];
};

export const portfolioInboxKey = (userId: string) =>
  ['portfolio-inbox', userId] as const;

export const ticketDetailKey = (
  userId: string,
  workspaceId: string,
  ticketId: string
) => [...portfolioInboxKey(userId), 'ticket', workspaceId, ticketId] as const;

export const listKey = (userId: string, workspaceId: string) =>
  [...portfolioInboxKey(userId), 'tickets', workspaceId] as const;

export function isPortfolioStaff(role: string) {
  return [
    'owner',
    'manager',
    'maintenance_coordinator',
    'dispatcher',
    'field',
    'accountant',
    'viewer',
  ].includes(role);
}

export function canManageInbox(role: string) {
  return ['owner', 'manager', 'maintenance_coordinator'].includes(role);
}

export const inboxLabel = (value: string) =>
  value.replace(/_/g, ' ').replace(/^\w/, (first) => first.toUpperCase());

export const propertyLabel = (property: InboxProperty) =>
  property.property_name || property.address || 'Unnamed property';

export const inboxStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error
    ? error.statusCode
    : undefined;

export function inboxError(error: unknown, fallback: string) {
  const code = inboxStatusCode(error);
  if (code === 401) return 'Your session has ended. Sign in again to continue.';
  if (code === 402) return 'Portfolio access is not available on this account.';
  if (code === 403)
    return 'You do not have permission for this workspace or ticket.';
  if (code === 404) return 'This workspace or ticket could not be found.';
  if (code === 429) return 'Too many requests. Wait a moment, then try again.';
  if (code === 400 && error instanceof Error) return error.message || fallback;
  return fallback;
}
