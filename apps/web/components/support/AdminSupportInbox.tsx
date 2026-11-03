'use client';
import { useCallback, useEffect, useState } from 'react';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';
import { CommunicationComposer } from './CommunicationComposer';
import { SupportTeam } from './SupportTeam';
type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string;
  guest_email: string | null;
  assigned_to: string | null;
  response_due_at: string;
  escalated_at: string | null;
  revision: number;
};
type Operator = {
  admin_id: string;
  available: boolean;
  capacity: number;
  can_broadcast: boolean;
  can_manage_team: boolean;
  name?: string;
};
type Reply = {
  id: string;
  body: string;
  internal: boolean;
  created_at: string;
  author_id: string | null;
  author_label: string;
};
type Delivery = {
  id: string;
  channel: string;
  status: string;
  last_error: string | null;
  subject: string;
  recipient_email: string | null;
  provider_id: string | null;
  attempts: number;
};
type Inbox = {
  tickets: Ticket[];
  operators: Operator[];
  deliveries: Delivery[];
  currentAdminId: string;
};
export function AdminSupportInbox() {
  const { csrfToken } = useCSRF();
  const [data, setData] = useState<Inbox | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [mfa, setMfa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState(false);
  const [closed, setClosed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const api = useCallback(
    async <T,>(path: string, method = 'GET', payload?: unknown): Promise<T> => {
      const r = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      const d = await r.json();
      if (d.requiresStepUp) {
        setMfa(true);
        throw new Error('Verify MFA, then retry the action.');
      }
      if (!r.ok)
        throw new Error(d.error?.message || d.error || 'Request failed');
      return d;
    },
    [csrfToken]
  );
  const load = useCallback(async () => {
    setData(
      await api<Inbox>(
        `/api/admin/support?mine=${mine ? '1' : '0'}&closed=${closed ? '1' : '0'}`
      )
    );
  }, [api, mine, closed]);
  useEffect(() => {
    void load().catch((e) => setNotice(e.message));
  }, [load]);
  async function open(id: string) {
    const d = await api<{ ticket: Ticket; messages: Reply[] }>(
      `/api/admin/support/${id}`
    );
    setTicket(d.ticket);
    setReplies(d.messages);
    setBody('');
    setReason('');
    setRequestId(crypto.randomUUID());
  }
  async function act(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      await work();
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }
  const current = data?.operators.find(
    (o) => o.admin_id === data.currentAdminId
  );
  return (
    <main className='mx-auto max-w-7xl p-6 space-y-6 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:border [&_button]:border-gray-200 [&_button]:disabled:opacity-50'>
      <header>
        <h1 className='text-3xl font-semibold'>Customer service</h1>
        <p>
          One owner per case. Customer replies and private team notes stay
          separate.
        </p>
      </header>
      <div className='flex flex-wrap gap-4'>
        <label>
          <input
            type='checkbox'
            checked={mine}
            onChange={(e) => setMine(e.target.checked)}
          />{' '}
          My cases
        </label>
        <label>
          <input
            type='checkbox'
            checked={closed}
            onChange={(e) => setClosed(e.target.checked)}
          />{' '}
          Include closed
        </label>
        <button onClick={() => void act(load)}>Refresh inbox</button>
        {current && (
          <button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await api('/api/admin/support/operators', 'PATCH', {
                  adminId: current.admin_id,
                  available: !current.available,
                  capacity: current.capacity,
                });
              })
            }
          >
            {current.available
              ? 'Available — pause new assignments'
              : 'Unavailable — accept assignments'}
          </button>
        )}
      </div>
      <p role='status'>{notice}</p>
      <div className='grid gap-5 lg:grid-cols-[320px_1fr]'>
        <aside className='space-y-2'>
          {data?.tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => void act(() => open(t.id))}
              className='block w-full rounded-xl border bg-white p-4 text-left'
            >
              <strong>{t.subject}</strong>
              <span className='block text-sm'>
                {t.category} · {t.priority} · {t.status}
              </span>
              <span className='block text-xs'>
                {t.assigned_to
                  ? data.operators.find((o) => o.admin_id === t.assigned_to)
                      ?.name || 'Assigned operator'
                  : 'Unassigned'}
                {t.escalated_at ? ' · Escalated' : ''}
              </span>
            </button>
          ))}
          {data?.tickets.length === 0 && <p>No matching cases.</p>}
        </aside>
        <section className='rounded-xl border bg-white p-5 space-y-4'>
          {ticket ? (
            <>
              <h2 className='text-xl font-semibold'>{ticket.subject}</h2>
              <p className='text-xs'>
                Case {ticket.id} · {ticket.guest_email || 'Registered customer'}{' '}
                · Response review due{' '}
                {new Date(ticket.response_due_at).toLocaleString('en-GB')}
              </p>
              {replies.length === 0 && (
                <p className='whitespace-pre-wrap'>{ticket.message}</p>
              )}
              {replies.map((m) => (
                <article
                  key={m.id}
                  className={`rounded p-3 ${m.internal ? 'bg-amber-50 border border-amber-300' : 'bg-gray-50'}`}
                >
                  <strong className='text-xs'>
                    {m.internal
                      ? `Private team note · ${m.author_label}`
                      : m.author_label}
                  </strong>
                  <p className='whitespace-pre-wrap'>{m.body}</p>
                  <time className='text-xs'>
                    {new Date(m.created_at).toLocaleString('en-GB')}
                  </time>
                </article>
              ))}
              <label className='block'>
                Reply or note
                <textarea
                  className='block w-full rounded border p-3'
                  rows={5}
                  maxLength={5000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
              <label>
                <input
                  type='checkbox'
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />{' '}
                Private note — never sent to the customer
              </label>
              <button
                className='btn-primary block'
                disabled={busy || !body.trim()}
                onClick={() =>
                  void act(async () => {
                    await api(`/api/admin/support/${ticket.id}`, 'POST', {
                      body,
                      internal,
                      requestId,
                    });
                    await open(ticket.id);
                    setNotice(
                      internal
                        ? 'Private note saved.'
                        : 'Reply saved and notification queued.'
                    );
                  })
                }
              >
                {internal ? 'Save private note' : 'Send customer reply'}
              </button>
              <hr />
              <h3 className='font-semibold'>Ownership and handover</h3>
              <label className='block'>
                Assigned admin
                <select
                  className='block w-full border rounded p-2'
                  value={ticket.assigned_to || ''}
                  onChange={(e) =>
                    setTicket({
                      ...ticket,
                      assigned_to: e.target.value || null,
                    })
                  }
                >
                  <option value=''>Unassigned</option>
                  {data?.operators.map((o) => (
                    <option
                      key={o.admin_id}
                      value={o.admin_id}
                      disabled={!o.available}
                    >
                      {o.name || 'Operator'}
                      {o.available ? '' : ' (unavailable)'}
                    </option>
                  ))}
                </select>
              </label>
              <div className='flex gap-4'>
                <label>
                  Status
                  <select
                    aria-label='Case status'
                    className='block border p-2'
                    value={ticket.status}
                    onChange={(e) =>
                      setTicket({ ...ticket, status: e.target.value })
                    }
                  >
                    {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    aria-label='Case priority'
                    className='block border p-2'
                    value={ticket.priority}
                    onChange={(e) =>
                      setTicket({ ...ticket, priority: e.target.value })
                    }
                  >
                    {['low', 'normal', 'high', 'urgent'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className='block'>
                Reason / handover notes
                <input
                  className='block w-full border rounded p-3'
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !reason.trim()}
                onClick={() =>
                  void act(async () => {
                    await api(`/api/admin/support/${ticket.id}`, 'PATCH', {
                      revision: ticket.revision,
                      status: ticket.status,
                      assignedTo: ticket.assigned_to,
                      priority: ticket.priority,
                      reason,
                    });
                    await open(ticket.id);
                    setNotice('Case updated.');
                  })
                }
              >
                Save case changes
              </button>
              <p className='text-sm'>
                Closing a cancellation case does not release a payment hold. Use
                the existing MFA-protected payment review separately.
              </p>
            </>
          ) : (
            <p>Select a case to read and reply.</p>
          )}
        </section>
      </div>
      {current?.can_broadcast && (
        <CommunicationComposer api={api} onResult={setNotice} />
      )}
      {current?.can_manage_team && data && (
        <SupportTeam
          key={JSON.stringify(data.operators)}
          operators={data.operators}
          api={api}
          onResult={setNotice}
          onSaved={load}
        />
      )}
      <section className='rounded-xl border bg-white p-5'>
        <h2 className='text-xl font-semibold'>Recent delivery activity</h2>
        <p className='text-sm'>
          Accepted means handed to a provider or notification queue. It does not
          prove inbox or device delivery. Review uncertain sends before
          retrying.
        </p>
        <table className='w-full text-left text-sm'>
          <thead>
            <tr>
              <th>Message</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {data?.deliveries.slice(0, 30).map((d) => (
              <tr key={d.id}>
                <td>
                  {d.subject}
                  <small className='block'>
                    {d.recipient_email || 'App recipient'} · {d.attempts}{' '}
                    attempts
                  </small>
                </td>
                <td>{d.channel}</td>
                <td>{d.status}</td>
                <td>
                  {d.last_error || '—'}
                  {d.provider_id && (
                    <small className='block break-all'>
                      Provider reference: {d.provider_id}
                    </small>
                  )}
                  {current?.can_broadcast &&
                    d.status === 'failed' &&
                    !d.provider_id && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act(async () => {
                            await api(
                              `/api/admin/support/deliveries/${d.id}/retry`,
                              'POST'
                            );
                            setNotice('Delivery queued for retry.');
                          })
                        }
                      >
                        Retry rejected send
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {mfa && (
        <MfaStepUpDialog
          onCancel={() => setMfa(false)}
          onSuccess={() => {
            setMfa(false);
            setNotice('Verified. Review and retry your action.');
          }}
        />
      )}
    </main>
  );
}
