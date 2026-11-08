'use client';
import { useEffect, useRef, useState } from 'react';
import {
  propertyFollowupDate,
  propertyFollowupDeadline,
} from '@mintenance/shared';
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
type Props = {
  propertyId: string;
  kind: string;
  sourceId: string;
  onSaved: () => void;
};
export function FollowupForm(props: Props) {
  return (
    <FollowupEditor
      key={`${props.propertyId}:${props.kind}:${props.sourceId}`}
      {...props}
    />
  );
}
function FollowupEditor({ propertyId, kind, sourceId, onSaved }: Props) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [assigned, setAssigned] = useState(''),
    [due, setDue] = useState(''),
    [waiting, setWaiting] = useState('manager'),
    [note, setNote] = useState('');
  const [reload, setReload] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const url = `/api/properties/${propertyId}/followups`;
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    setBlocked(true);
    const timeout = setTimeout(() => {
      controller.abort();
      setError('Loading took too long. Retry loading this follow-up.');
    }, 15000);
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
        if (controller.signal.aborted) return;
        if (
          !value ||
          !Array.isArray(value.people) ||
          !Array.isArray(value.updates) ||
          (value.followup !== null &&
            (!value.followup || !Number.isInteger(value.followup.revision)))
        )
          throw new Error(
            'Follow-up details could not be confirmed. Please reload.'
          );
        setData(value);
        setAssigned(value.followup?.assigned_to || '');
        setDue(propertyFollowupDate(value.followup?.due_at));
        setWaiting(value.followup?.waiting_for || 'manager');
        setBlocked(false);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [url, kind, sourceId, reload]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || saving.current || blocked) return;
    const deadline = due ? propertyFollowupDeadline(due) : null;
    if (due && !deadline) {
      setError('Enter a valid calendar date.');
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let failure =
      'Save could not be confirmed. Reload and check recorded updates before saving again. Your input is still here.';
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        signal: controller.signal,
        headers: {
          ...(await getCsrfHeaders()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind,
          sourceId,
          revision: data.followup?.revision || 0,
          assignedTo: assigned || null,
          dueAt:
            due === propertyFollowupDate(data.followup?.due_at)
              ? (data.followup?.due_at ?? null)
              : deadline,
          waitingFor: waiting,
          note,
        }),
      });
      if (!mounted.current) return;
      if (!response.ok) {
        failure =
          response.status === 409
            ? 'This follow-up changed. Reload and review the latest values before saving. Your note is still here.'
            : response.status === 401 || response.status === 403
              ? 'Your access could not be confirmed. Sign in or ask the property owner for access, then reload.'
              : failure;
        throw new Error(failure);
      }
      const result = await response.json();
      if (!mounted.current) return;
      if (result?.followup?.revision !== (data.followup?.revision ?? 0) + 1)
        throw new Error(
          'Save could not be confirmed. Reload and check recorded updates before saving again.'
        );
      setNote('');
      setMessage('Follow-up saved.');
      onSaved();
      setReload((value) => value + 1);
    } catch {
      if (!mounted.current) return;
      setBlocked(true);
      setError(failure);
    } finally {
      clearTimeout(timeout);
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      aria-label='Property follow-up'
      className='mt-4 space-y-3 rounded border border-slate-200 bg-slate-50 p-4'
    >
      <p>
        Assign responsibility and a follow-up date. Assigned managers receive an
        update notification; these notes are not sent to tenants or contractors.
      </p>
      {message && <p role='status'>{message}</p>}
      {error && (
        <p role='alert'>
          {error}{' '}
          <button
            type='button'
            disabled={busy}
            onClick={() => {
              setMessage('');
              setReload((value) => value + 1);
            }}
            className='min-h-12 px-3 underline'
          >
            Reload
          </button>
        </p>
      )}
      {!data ? (
        <p role='status'>
          {error
            ? 'Follow-up unavailable. Reload to try again.'
            : 'Loading follow-up…'}
        </p>
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
              Follow up by (UK date){' '}
              <input
                type='date'
                value={due}
                onChange={(event) => setDue(event.target.value)}
              />
            </label>
            <p className='w-full text-sm text-slate-600'>
              Due by the end of the selected day in Europe/London, including
              daylight saving.
            </p>
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
            <button disabled={blocked} className='btn btn-primary min-h-12'>
              {busy ? 'Saving…' : 'Save follow-up'}
            </button>
          </fieldset>
          <details>
            <summary>Latest 50 recorded updates</summary>
            {data.updates.map((update) => (
              <p className='whitespace-pre-wrap border-t py-2' key={update.id}>
                {new Date(update.created_at).toLocaleString('en-GB', {
                  timeZone: 'Europe/London',
                })}{' '}
                UK time
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
