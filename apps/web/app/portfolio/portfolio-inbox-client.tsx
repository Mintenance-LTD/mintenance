'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type TicketStatus = 'open' | 'triaged' | 'in_progress' | 'blocked' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface PortfolioInboxClientProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface PortfolioAccessResponse {
  allowed: boolean;
  requiresSubscription: boolean;
  subscriptionStatus: string;
  message: string | null;
  upgradeUrl: string;
}

interface PortfolioProperty {
  id: string;
  property_name: string | null;
  address: string | null;
  property_type?: string | null;
}

interface TicketSummary {
  id: string;
  org_id: string;
  property_id: string;
  unit_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  reported_by: string;
  sla_due_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketUpdate {
  id: string;
  author_id: string;
  update_type: 'comment' | 'status_change' | 'assignment' | 'resolution';
  body: string;
  visibility: 'internal' | 'tenant_visible';
  created_at: string;
}

interface TicketDetailResponse {
  ticket: TicketSummary;
  updates: TicketUpdate[];
}

const STATUS_OPTIONS: TicketStatus[] = ['open', 'triaged', 'in_progress', 'blocked', 'resolved', 'closed'];
const PRIORITY_OPTIONS: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

const toLabel = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());

export function PortfolioInboxClient({ user }: PortfolioInboxClientProps) {
  const [mobileView, setMobileView] = useState<'inbox' | 'detail' | 'create'>('inbox');
  const [access, setAccess] = useState<PortfolioAccessResponse | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');

  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketSummary | null>(null);
  const [ticketUpdates, setTicketUpdates] = useState<TicketUpdate[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<TicketStatus>('open');
  const [updatePriority, setUpdatePriority] = useState<TicketPriority>('medium');
  const [resolutionNote, setResolutionNote] = useState('');

  const [creatingTicket, setCreatingTicket] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');

  const filteredTickets = useMemo(() => {
    if (statusFilter === 'all') {
      return tickets;
    }
    return tickets.filter((ticket) => ticket.status === statusFilter);
  }, [tickets, statusFilter]);

  useEffect(() => {
    let mounted = true;

    const loadAccess = async () => {
      setAccessLoading(true);
      setAccessError(null);

      try {
        const response = await fetch('/api/portfolio/access', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to verify portfolio access');
        }

        if (!mounted) return;
        setAccess(data as PortfolioAccessResponse);
      } catch (error) {
        if (!mounted) return;
        setAccessError(error instanceof Error ? error.message : 'Failed to verify portfolio access');
      } finally {
        if (mounted) setAccessLoading(false);
      }
    };

    loadAccess();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!access?.allowed) return;
    void loadTickets();
    void loadProperties();
  }, [access?.allowed]);

  useEffect(() => {
    if (!selectedTicketId || !access?.allowed) return;
    void loadTicketDetail(selectedTicketId);
  }, [selectedTicketId, access?.allowed]);

  const loadTickets = async () => {
    setTicketsLoading(true);
    setTicketsError(null);
    setCreateSuccess(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/portfolio/tickets?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to load tickets');
      }

      const ticketItems = (data?.tickets || []) as TicketSummary[];
      setTickets(ticketItems);
      setOrgId(data?.orgId || null);

      if (!selectedTicketId && ticketItems.length > 0) {
        setSelectedTicketId(ticketItems[0].id);
      }
      if (selectedTicketId && !ticketItems.some((ticket) => ticket.id === selectedTicketId)) {
        setSelectedTicketId(ticketItems[0]?.id || null);
      }
    } catch (error) {
      setTicketsError(error instanceof Error ? error.message : 'Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  const loadProperties = async () => {
    setPropertiesLoading(true);
    try {
      const response = await fetch('/api/portfolio/properties', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to load properties');
      }
      setProperties((data?.properties || []) as PortfolioProperty[]);
    } catch {
      setProperties([]);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    setTicketLoading(true);
    setTicketError(null);

    try {
      const response = await fetch(`/api/portfolio/tickets/${ticketId}`, { cache: 'no-store' });
      const data = (await response.json()) as TicketDetailResponse & { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to load ticket detail');
      }

      setSelectedTicket(data.ticket);
      setTicketUpdates(data.updates || []);
      setUpdateStatus(data.ticket.status);
      setUpdatePriority(data.ticket.priority);
      setResolutionNote('');
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : 'Failed to load ticket detail');
      setSelectedTicket(null);
      setTicketUpdates([]);
    } finally {
      setTicketLoading(false);
    }
  };

  const submitTicketUpdate = async () => {
    if (!selectedTicketId || !selectedTicket) return;
    setUpdatingTicket(true);
    setTicketError(null);

    try {
      const payload: Record<string, unknown> = {};
      if (updateStatus !== selectedTicket.status) payload.status = updateStatus;
      if (updatePriority !== selectedTicket.priority) payload.priority = updatePriority;
      if (resolutionNote.trim().length > 0) payload.resolutionNote = resolutionNote.trim();

      if (Object.keys(payload).length === 0) {
        setUpdatingTicket(false);
        return;
      }

      const response = await fetch(`/api/portfolio/tickets/${selectedTicketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to update ticket');
      }

      await Promise.all([loadTickets(), loadTicketDetail(selectedTicketId)]);
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : 'Failed to update ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const submitNewTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!orgId) {
      setCreateError('No organization context found for this account.');
      return;
    }
    if (!newPropertyId) {
      setCreateError('Select a property before creating a ticket.');
      return;
    }

    setCreatingTicket(true);
    try {
      const response = await fetch('/api/portfolio/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          propertyId: newPropertyId,
          title: newTitle,
          description: newDescription,
          category: newCategory,
          priority: newPriority,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to create ticket');
      }

      setCreateSuccess('Ticket created.');
      setNewTitle('');
      setNewDescription('');
      setNewCategory('general');
      setNewPriority('medium');

      await loadTickets();
      if (data?.ticket?.id) {
        setSelectedTicketId(data.ticket.id);
        setMobileView('detail');
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Portfolio Inbox</h1>
          <p className="text-sm text-gray-600">
            Manage maintenance tickets across your properties.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Signed in as <span className="font-medium text-gray-700">{user.name}</span>
        </div>
      </div>

      {accessLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Checking portfolio access...
        </div>
      )}

      {!accessLoading && accessError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {accessError}
        </div>
      )}

      {!accessLoading && access && !access.allowed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">Portfolio Mode Locked</h2>
          <p className="mt-2 text-sm text-amber-800">
            {access.message || 'Upgrade to access landlord and agent maintenance workflows.'}
          </p>
          <div className="mt-4">
            <Link
              href={access.upgradeUrl || '/pricing?feature=portfolio_mode'}
              className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      )}

      {!accessLoading && access?.allowed && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-gray-200 bg-white p-3 lg:col-span-12 lg:hidden">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMobileView('inbox')}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  mobileView === 'inbox' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Inbox
              </button>
              <button
                type="button"
                onClick={() => setMobileView('detail')}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  mobileView === 'detail' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Detail
              </button>
              <button
                type="button"
                onClick={() => setMobileView('create')}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  mobileView === 'create' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Create
              </button>
            </div>
          </section>

          <section
            className={`rounded-xl border border-gray-200 bg-white p-4 lg:col-span-4 ${
              mobileView === 'inbox' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Tickets</h2>
              <button
                type="button"
                onClick={() => void loadTickets()}
                className="text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                Refresh
              </button>
            </div>

            <label className="mb-3 block text-xs text-gray-600">
              Status filter
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | TicketStatus)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="all">All</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {toLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            {ticketsLoading ? (
              <p className="text-sm text-gray-600">Loading tickets...</p>
            ) : ticketsError ? (
              <p className="text-sm text-red-700">{ticketsError}</p>
            ) : filteredTickets.length === 0 ? (
              <p className="text-sm text-gray-600">No tickets found.</p>
            ) : (
              <div className="space-y-2">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(ticket.id);
                      setMobileView('detail');
                    }}
                    className={`w-full rounded-lg border p-3 text-left ${
                      selectedTicketId === ticket.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      {toLabel(ticket.priority)} priority · {toLabel(ticket.status)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section
            className={`rounded-xl border border-gray-200 bg-white p-4 lg:col-span-8 ${
              mobileView === 'detail' ? 'block' : 'hidden lg:block'
            }`}
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Ticket Detail</h2>

            {ticketLoading ? (
              <p className="text-sm text-gray-600">Loading ticket detail...</p>
            ) : ticketError ? (
              <p className="text-sm text-red-700">{ticketError}</p>
            ) : !selectedTicket ? (
              <p className="text-sm text-gray-600">Select a ticket to view details.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.title}</h3>
                  <p className="mt-2 text-sm text-gray-700">{selectedTicket.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="rounded bg-gray-100 px-2 py-1">Status: {toLabel(selectedTicket.status)}</span>
                    <span className="rounded bg-gray-100 px-2 py-1">Priority: {toLabel(selectedTicket.priority)}</span>
                    <span className="rounded bg-gray-100 px-2 py-1">Category: {toLabel(selectedTicket.category)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-sm text-gray-700">
                    Status
                    <select
                      value={updateStatus}
                      onChange={(event) => setUpdateStatus(event.target.value as TicketStatus)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {toLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-gray-700">
                    Priority
                    <select
                      value={updatePriority}
                      onChange={(event) => setUpdatePriority(event.target.value as TicketPriority)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {toLabel(priority)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm text-gray-700">
                  Resolution note (optional)
                  <textarea
                    value={resolutionNote}
                    onChange={(event) => setResolutionNote(event.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    placeholder="Add context for this update"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void submitTicketUpdate()}
                  disabled={updatingTicket}
                  className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingTicket ? 'Updating...' : 'Update Ticket'}
                </button>

                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-800">Timeline</h4>
                  {ticketUpdates.length === 0 ? (
                    <p className="text-sm text-gray-600">No updates yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {ticketUpdates.map((update) => (
                        <div key={update.id} className="rounded-md border border-gray-200 p-3">
                          <p className="text-xs text-gray-500">
                            {toLabel(update.update_type)} · {new Date(update.created_at).toLocaleString()}
                          </p>
                          <p className="mt-1 text-sm text-gray-700">{update.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section
            className={`rounded-xl border border-gray-200 bg-white p-4 lg:col-span-12 ${
              mobileView === 'create' ? 'block' : 'hidden lg:block'
            }`}
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Create Ticket</h2>

            {!orgId && (
              <p className="mb-3 text-sm text-amber-700">
                No organization membership found. You need an active organization before creating tickets.
              </p>
            )}

            <form onSubmit={submitNewTicket} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm text-gray-700 md:col-span-1">
                Property
                <select
                  value={newPropertyId}
                  onChange={(event) => setNewPropertyId(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  disabled={propertiesLoading}
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.property_name || 'Unnamed property'}{property.address ? ` - ${property.address}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700 md:col-span-1">
                Priority
                <select
                  value={newPriority}
                  onChange={(event) => setNewPriority(event.target.value as TicketPriority)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {toLabel(priority)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700 md:col-span-2">
                Title
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="Kitchen sink leaking"
                  required
                  minLength={3}
                  maxLength={200}
                />
              </label>

              <label className="text-sm text-gray-700 md:col-span-1">
                Category
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="plumbing"
                  maxLength={100}
                />
              </label>

              <label className="text-sm text-gray-700 md:col-span-2">
                Description
                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="Describe the issue in detail..."
                  rows={3}
                  required
                  minLength={10}
                  maxLength={5000}
                />
              </label>

              {createError && <p className="text-sm text-red-700 md:col-span-2">{createError}</p>}
              {createSuccess && <p className="text-sm text-emerald-700 md:col-span-2">{createSuccess}</p>}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={creatingTicket || !orgId}
                  className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingTicket ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
