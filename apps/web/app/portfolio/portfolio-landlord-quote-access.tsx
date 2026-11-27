'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { agencyRequest } from '../agency-work/dispatch-client';

const button =
  'min-h-11 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-50';
const textButton =
  'min-h-11 text-sm font-semibold text-teal-900 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800 disabled:opacity-50';

export function PortfolioLandlordQuoteAccess({
  workspaceId,
  landlordId,
  landlordName,
}: {
  workspaceId: string;
  landlordId: string;
  landlordName: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className='mt-2 border-t border-slate-200 pt-1'>
      <button
        type='button'
        className={textButton}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide quote access' : 'Manage landlord quote access'}
      </button>
      <div id={id} hidden={!open}>
        {open && (
          <AccessEditor
            workspaceId={workspaceId}
            landlordId={landlordId}
            landlordName={landlordName}
          />
        )}
      </div>
    </div>
  );
}

function AccessEditor({
  workspaceId,
  landlordId,
  landlordName,
}: {
  workspaceId: string;
  landlordId: string;
  landlordName: string;
}) {
  const url =
    '/api/organizations/' +
    encodeURIComponent(workspaceId) +
    '/agency-landlords/' +
    encodeURIComponent(landlordId) +
    '/identity';
  const [linked, setLinked] = useState<boolean>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [reload, setReload] = useState(0);
  const [review, setReview] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setLoading(true);
    void agencyRequest<{ linked: boolean }>(url, { signal: controller.signal })
      .then(({ linked }) => {
        if (!controller.signal.aborted) setLinked(linked);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) {
          setLinked(undefined);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, reload]);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !review || linked === undefined) return;
    busy.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await agencyRequest<{ linked: boolean }>(url, {
        method: 'PUT',
        action: { landlordEmail: linked ? null : email.trim() },
      });
      if (typeof result.linked !== 'boolean')
        throw new Error(
          'Could not confirm the change. Reload before retrying.'
        );
      setLinked(result.linked);
      setEmail('');
      setReview(false);
      setNotice(
        result.linked
          ? 'Quote access linked. No invitation or message was sent.'
          : 'Landlord quote access removed.'
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not change quote access.'
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className='space-y-2 pb-2 text-sm'>
      {loading && <p role='status'>Checking quote access…</p>}
      {error && (
        <p role='alert' className='text-red-800'>
          {error}
        </p>
      )}
      {notice && (
        <p role='status' className='text-teal-900'>
          {notice}
        </p>
      )}
      {!loading && linked === undefined && (
        <button
          type='button'
          className={textButton}
          onClick={() => setReload((v) => v + 1)}
        >
          Retry quote access
        </button>
      )}
      {!loading && linked !== undefined && (
        <form className='space-y-2' onSubmit={update}>
          <p>
            {linked
              ? 'A Mintenance account is linked for quote approval.'
              : 'No account is linked for quote approval.'}
          </p>
          {!linked && (
            <label className='block'>
              Landlord’s existing Mintenance account email
              <input
                type='email'
                className='mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm'
                required
                maxLength={254}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setReview(false);
                }}
                disabled={pending}
              />
            </label>
          )}
          {!review ? (
            <button
              type='button'
              className={textButton}
              disabled={!linked && !email.trim()}
              onClick={() => setReview(true)}
            >
              {linked ? 'Review removal' : 'Review account link'}
            </button>
          ) : (
            <>
              <p className='break-words'>
                {linked
                  ? 'Remove quote access for '
                  : 'Allow this account to review quotes on properties linked to '}
                {landlordName}?
              </p>
              {!linked && (
                <p className='break-words font-semibold'>{email.trim()}</p>
              )}
              <div className='flex flex-wrap gap-2'>
                <button className={button} type='submit' disabled={pending}>
                  {linked ? 'Remove quote access' : 'Link account'}
                </button>
                <button
                  className={textButton}
                  type='button'
                  disabled={pending}
                  onClick={() => setReview(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}
