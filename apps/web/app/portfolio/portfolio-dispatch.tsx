'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  agencyRequest,
  canAssign,
  dispatchEndpoint,
  DispatchRequestError,
  isClosed,
} from '../agency-work/dispatch-client';
import type { Dispatch } from '../agency-work/dispatch-client';
import { amountLabel, parsePounds } from './work-order-model';

const control =
  'mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-700/30 sm:text-sm';
const primary =
  'min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-50';
const secondary =
  'min-h-11 text-sm font-semibold text-teal-900 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800 disabled:opacity-50';

const approvalMessage = {
  within_limit: 'Within the recorded works authorisation limit.',
  landlord_approved: 'The linked landlord approved this exact quote.',
  approval_required:
    'Landlord approval is required before you can assign the work.',
  no_landlord:
    'Link the property to a landlord and link their existing account in Agency CRM before assigning work.',
  no_quote: 'Save the quote amount and scope first.',
} as const;

export function PortfolioDispatch({ ticketId }: { ticketId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-labelledby={id}
      className='mt-4 rounded-lg border border-slate-200 bg-white p-3'
    >
      <h5 id={id} className='font-semibold text-slate-900'>
        Quote approval and private assignment
      </h5>
      <p className='mt-1 text-sm text-slate-600'>
        Save a quote for landlord approval or assign it under an existing works
        limit. First save the work order above using “Our contractor”. The quote
        here authorises assignment; the cost record does not.
      </p>
      <button
        type='button'
        className={secondary}
        aria-expanded={open}
        aria-controls={id + '-actions'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide approval and assignment' : 'Open approval and assignment'}
      </button>
      <div id={id + '-actions'} hidden={!open}>
        {open && <DispatchEditor ticketId={ticketId} key={ticketId} />}
      </div>
    </section>
  );
}

function DispatchEditor({ ticketId }: { ticketId: string }) {
  const [order, setOrder] = useState<Dispatch>();
  const [quote, setQuote] = useState('');
  const [scope, setScope] = useState('');
  const [contractorEmail, setContractorEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [reload, setReload] = useState(0);
  const url = dispatchEndpoint(ticketId);
  const [reviewRevoke, setReviewRevoke] = useState(false);
  const busy = useRef(false);
  const savedAmount =
    order?.quotePence == null ? '' : (order.quotePence / 100).toFixed(2);
  const dirtyQuote =
    quote.trim() !== savedAmount || scope.trim() !== (order?.quoteScope ?? '');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void agencyRequest<{ dispatch: Dispatch }>(url, {
      signal: controller.signal,
    })
      .then(({ dispatch }) => {
        if (controller.signal.aborted) return;
        if (dispatch?.viewer !== 'staff' || dispatch.ticketId !== ticketId)
          throw new Error('Agency staff access is required.');
        setOrder(dispatch);
        setQuote(
          dispatch.quotePence == null
            ? ''
            : (dispatch.quotePence / 100).toFixed(2)
        );
        setScope(dispatch.quoteScope ?? '');
        setStale(false);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setOrder(undefined);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, reload, ticketId]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    kind: 'quote' | 'dispatch' | 'revoke'
  ) {
    event.preventDefault();
    if (
      !order ||
      busy.current ||
      stale ||
      loading ||
      (kind === 'dispatch' && (dirtyQuote || !canAssign(order))) ||
      (kind === 'quote' && isClosed(order)) ||
      (kind === 'revoke' && (!order.dispatchedAt || !reviewRevoke))
    )
      return;
    busy.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const amount =
        kind === 'quote' ? parsePounds(quote, 'Quote total') : null;
      if (kind === 'quote' && (amount === null || !scope.trim()))
        throw new Error('Enter the quote total and the work it covers.');
      const action =
        kind === 'quote'
          ? {
              action: 'quote',
              revision: order.revision,
              quotePence: amount,
              quoteScope: scope.trim(),
            }
          : {
              action: kind,
              revision: order.revision,
              quoteVersion: order.quoteVersion,
              ...(kind === 'dispatch' && {
                contractorEmail: contractorEmail.trim(),
              }),
            };
      const { dispatch } = await agencyRequest<{ dispatch: Dispatch }>(url, {
        action,
      });
      if (dispatch?.viewer !== 'staff' || dispatch.ticketId !== ticketId)
        throw new Error(
          'Could not confirm the update. Reload before retrying.'
        );
      setOrder(dispatch);
      setQuote(
        dispatch.quotePence == null
          ? ''
          : (dispatch.quotePence / 100).toFixed(2)
      );
      setScope(dispatch.quoteScope ?? '');
      if (kind === 'dispatch') setContractorEmail('');
      if (kind === 'revoke') setReviewRevoke(false);
      setNotice(
        kind === 'dispatch'
          ? 'Assigned privately to the contractor’s Mintenance account. No marketplace job was posted.'
          : kind === 'revoke'
            ? 'Assignment removed. The contractor no longer has access through their private inbox.'
            : 'Quote saved.'
      );
    } catch (e) {
      if (e instanceof DispatchRequestError && e.status === 409) setStale(true);
      setError(
        e instanceof Error ? e.message : 'Could not save the work order.'
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className='mt-3 space-y-3'>
      {loading && (
        <p role='status' className='text-sm'>
          Loading approval and assignment…
        </p>
      )}
      {error && (
        <p role='alert' className='text-sm text-red-800'>
          {error}
        </p>
      )}
      {notice && (
        <p role='status' className='text-sm text-teal-900'>
          {notice}
        </p>
      )}
      {!loading && (!order || stale) && (
        <button
          type='button'
          className={secondary}
          onClick={() => setReload((v) => v + 1)}
        >
          Reload work order
        </button>
      )}
      {!loading && order && (
        <>
          <dl className='grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm'>
            <div>
              <dt>Latest quote</dt>
              <dd className='font-semibold'>
                {amountLabel(order.quotePence)}
                {order.quoteVersion != null && ' · v' + order.quoteVersion}
              </dd>
            </div>
            <div>
              <dt>Works limit</dt>
              <dd className='font-semibold'>
                {amountLabel(order.approvalLimitPence)}
              </dd>
            </div>
          </dl>
          <p className='text-sm text-slate-700'>
            {order.dispatchedAt
              ? order.acceptedAt
                ? 'Contractor accepted the private work order.'
                : 'Assigned privately. Waiting for the contractor to accept.'
              : order.decision === 'rejected'
                ? 'The landlord declined this quote. Revise it before asking again.'
                : order.authorization
                  ? approvalMessage[order.authorization]
                  : 'Assignment is unavailable.'}
          </p>
          {order.dispatchedAt && (
            <form
              className='space-y-2 rounded-lg border border-slate-200 p-3'
              onSubmit={(e) => void submit(e, 'revoke')}
            >
              {!reviewRevoke ? (
                <button
                  type='button'
                  className={secondary}
                  disabled={pending || stale}
                  onClick={() => setReviewRevoke(true)}
                >
                  Review removing assignment
                </button>
              ) : (
                <>
                  <p className='text-sm'>
                    Remove this work order from the contractor’s private inbox?
                    This doesn’t cancel any arrangements already made outside
                    Mintenance.
                  </p>
                  <div className='flex flex-wrap gap-3'>
                    <button
                      type='submit'
                      className={primary}
                      disabled={pending || stale}
                    >
                      Remove assignment
                    </button>
                    <button
                      type='button'
                      className={secondary}
                      disabled={pending}
                      onClick={() => setReviewRevoke(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
          {isClosed(order) && (
            <p className='text-sm text-slate-600'>
              Reopen the repair before preparing or assigning a quote.
            </p>
          )}
          {!order.dispatchedAt && !isClosed(order) && (
            <form
              className='space-y-3 rounded-lg border border-slate-200 p-3'
              onSubmit={(e) => void submit(e, 'quote')}
            >
              <label className='block text-sm'>
                Quote total including applicable VAT (£)
                <input
                  className={control}
                  required
                  inputMode='decimal'
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                />
              </label>
              <label className='block text-sm'>
                Scope visible to the landlord and assigned contractor
                <textarea
                  className={control}
                  required
                  maxLength={2000}
                  rows={3}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                />
              </label>
              <p className='text-xs text-slate-600'>
                Do not include door codes, private notes or tenant contact
                details. The linked landlord can find the quote in Agency quote
                approvals.
              </p>
              {!!order.quoteVersion && (
                <p className='text-xs text-slate-600'>
                  A revised quote needs its own authorisation. A previous
                  approval does not transfer.
                </p>
              )}
              <button
                className={primary}
                type='submit'
                disabled={stale || pending}
              >
                Save quote
              </button>
            </form>
          )}
          {canAssign(order) && (
            <form
              className='space-y-3 rounded-lg border border-slate-200 p-3'
              onSubmit={(e) => void submit(e, 'dispatch')}
            >
              <label className='block text-sm'>
                Contractor’s existing Mintenance account email
                <input
                  className={control}
                  required
                  type='email'
                  maxLength={254}
                  value={contractorEmail}
                  onChange={(e) => setContractorEmail(e.target.value)}
                />
              </label>
              <p className='text-xs text-slate-600'>
                Only this contractor will see the work order in their private
                inbox. There is no in-app payment.
              </p>
              {dirtyQuote && (
                <p className='text-sm text-amber-900'>
                  Save the changed quote or restore the saved amount and scope
                  before assigning.
                </p>
              )}
              <button
                className={primary}
                type='submit'
                disabled={stale || pending || dirtyQuote}
              >
                Assign privately
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
