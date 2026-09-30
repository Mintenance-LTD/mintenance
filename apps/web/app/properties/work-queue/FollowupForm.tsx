'use client';
import { useEffect, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
interface Data {
  followup: {
    revision: number;
    assigned_to: string | null;
    due_at: string | null;
    waiting_for: string;
  } | null;
  people: { id: string; first_name: string; last_name: string }[];
  updates: {
    id: string;
    body: string;
    created_at: string;
    delivery?: { status: string } | null;
  }[];
}
export function FollowupForm({
  propertyId,
  kind,
  sourceId,
  onSaved,
}: {
  propertyId: string;
  kind: string;
  sourceId: string;
  onSaved: () => void;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [assigned, setAssigned] = useState(''),
    [due, setDue] = useState(''),
    [waiting, setWaiting] = useState('manager'),
    [note, setNote] = useState('');
  const [reload, setReload] = useState(0);
  const url = `/api/properties/${propertyId}/followups`;
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    fetch(`${url}?kind=${kind}&sourceId=${sourceId}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            'Unable to load follow-up. Only owners and managers can edit.'
          );
        return response.json() as Promise<Data>;
      })
      .then((value) => {
        setData(value);
        setAssigned(value.followup?.assigned_to || '');
        setDue(value.followup?.due_at?.slice(0, 10) || '');
        setWaiting(value.followup?.waiting_for || 'manager');
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [url, kind, sourceId, reload]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...(await getCsrfHeaders()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind,
          sourceId,
          revision: data.followup?.revision || 0,
          assignedTo: assigned || null,
          dueAt: due ? `${due}T23:59:59.000Z` : null,
          waitingFor: waiting,
          note,
        }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? 'This follow-up changed. Reload before saving.'
            : 'Save failed. Your input is still here.'
        );
      setNote('');
      onSaved();
      setReload((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className='mt-4 space-y-3 rounded border p-4'>
      <p>
        Internal management follow-up. Notes do not send messages to tenants or
        contractors.
      </p>
      {error && (
        <p role='alert'>
          {error}{' '}
          <button
            type='button'
            onClick={() => setReload((value) => value + 1)}
            className='underline'
          >
            Reload
          </button>
        </p>
      )}
      {!data ? (
        <p>Load the follow-up to edit it.</p>
      ) : (
        <>
          <fieldset disabled={busy} className='flex flex-wrap gap-4'>
            <label>
              Responsible person{' '}
              <select
                value={assigned}
                onChange={(event) => setAssigned(event.target.value)}
              >
                <option value=''>Unassigned</option>
                {data.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.first_name} {person.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Follow up by (UTC){' '}
              <input
                type='date'
                value={due}
                onChange={(event) => setDue(event.target.value)}
              />
            </label>
            <label>
              Awaiting{' '}
              <select
                value={waiting}
                onChange={(event) => setWaiting(event.target.value)}
              >
                {['manager', 'tenant', 'contractor', 'approval'].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  )
                )}
              </select>
            </label>
            <label className='w-full'>
              Update{' '}
              <textarea
                className='block w-full rounded border p-2'
                maxLength={5000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button className='btn btn-primary'>
              {busy ? 'Saving…' : 'Save follow-up'}
            </button>
          </fieldset>
          <details>
            <summary>Latest 50 recorded updates</summary>
            {data.updates.map((update) => (
              <p className='whitespace-pre-wrap border-t py-2' key={update.id}>
                {new Date(update.created_at).toLocaleString('en-GB')}
                <br />
                {update.body}
                {update.delivery && (
                  <>
                    <br />
                    Assignment notification: {update.delivery.status}
                  </>
                )}
              </p>
            ))}
          </details>
        </>
      )}
    </form>
  );
}
