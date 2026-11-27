'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { amountLabel } from '../portfolio/work-order-model';
import {
  agencyRequest,
  dispatchEndpoint,
  DispatchRequestError,
  isClosed,
} from './dispatch-client';
import type { Dispatch } from './dispatch-client';

const button =
  'min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-50';
const secondary =
  'min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800 disabled:opacity-50';
type Action = 'approve' | 'reject' | 'accept';

export function AgencyWorkInbox({
  viewer,
}: {
  viewer: 'landlord' | 'contractor';
}) {
  const contractor = viewer === 'contractor';
  const [items, setItems] = useState<Dispatch[]>([]);
  const [load, setLoad] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string>();
  const [confirmation, setConfirmation] = useState<{
    ticketId: string;
    action: Action;
  }>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stale, setStale] = useState(false);
  const locked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setItems([]);
    void agencyRequest<{ items: Dispatch[] }>('/api/agency-work', {
      signal: controller.signal,
    })
      .then(({ items }) => {
        if (controller.signal.aborted) return;
        setItems(items.filter((order) => order.viewer === viewer));
        setStale(false);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load, viewer]);

  async function decide(order: Dispatch, action: Action) {
    if (
      locked.current ||
      stale ||
      loading ||
      isClosed(order) ||
      order.quoteVersion == null ||
      order.quotePence == null
    )
      return;
    locked.current = true;
    setPending(order.ticketId);
    setError('');
    setNotice('');
    try {
      const { dispatch } = await agencyRequest<{ dispatch: Dispatch }>(
        dispatchEndpoint(order.ticketId),
        {
          action: {
            action,
            quoteVersion: order.quoteVersion,
            revision: order.revision,
          },
        }
      );
      if (dispatch?.viewer !== viewer || dispatch.ticketId !== order.ticketId)
        throw new Error(
          'Could not confirm the update. Reload to check its status.'
        );
      setItems((old) =>
        old.map((item) => (item.ticketId === order.ticketId ? dispatch : item))
      );
      setConfirmation(undefined);
      setNotice(
        action === 'accept'
          ? 'Private work order accepted.'
          : action === 'approve'
            ? 'This quote was approved. No payment was made.'
            : 'This quote was declined.'
      );
    } catch (e) {
      if (
        e instanceof DispatchRequestError &&
        [403, 404, 409].includes(e.status)
      ) {
        setStale(true);
        setConfirmation(undefined);
      }
      setError(
        e instanceof Error ? e.message : 'Could not confirm this action.'
      );
    } finally {
      locked.current = false;
      setPending(undefined);
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8'>
      <div className='mx-auto max-w-3xl'>
        <Link
          className='inline-flex min-h-11 items-center text-sm font-semibold text-teal-900 underline'
          href={contractor ? '/contractor/dashboard-enhanced' : '/dashboard'}
        >
          Back to dashboard
        </Link>
        <h1 className='mt-2 text-3xl font-bold tracking-tight'>
          {contractor ? 'Private work orders' : 'Agency quote approvals'}
        </h1>
        <p className='mt-2 text-sm text-slate-700'>
          {contractor
            ? 'Work assigned directly to your Mintenance account by an agency, not marketplace jobs.'
            : 'Review quotes for the properties the agency manages for you. Approval does not make a payment.'}
        </p>
        <button
          type='button'
          className={secondary + ' mt-4'}
          disabled={!!pending || loading}
          onClick={() => {
            setConfirmation(undefined);
            setLoad((v) => v + 1);
          }}
        >
          Refresh
        </button>
        {loading && (
          <p role='status' className='mt-4 text-sm'>
            Loading agency work…
          </p>
        )}
        {error && (
          <p
            role='alert'
            className='mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800'
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role='status'
            className='mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-950'
          >
            {notice}
          </p>
        )}
        {!loading && !error && !items.length && (
          <p className='mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm'>
            {contractor
              ? 'No private work orders are assigned to you.'
              : 'No agency quotes are available for your account.'}
          </p>
        )}
        {!stale &&
          items.map((order) => {
            const decision =
              confirmation?.ticketId === order.ticketId
                ? confirmation.action
                : undefined;
            const ready =
              !isClosed(order) &&
              !order.dispatchedAt &&
              !order.decision &&
              order.quoteVersion != null;
            return (
              <section
                className='mt-4 rounded-xl border border-slate-200 bg-white p-4'
                key={order.ticketId}
              >
                <h2 className='break-words text-lg font-semibold'>
                  {order.title}
                </h2>
                <p className='mt-2 whitespace-pre-wrap break-words text-sm text-slate-700'>
                  {order.quoteScope}
                </p>
                <p className='mt-3 text-sm font-semibold'>
                  {amountLabel(order.quotePence)}
                  {order.quoteVersion != null &&
                    ' · Quote v' + order.quoteVersion}
                </p>
                {isClosed(order) && (
                  <p className='mt-2 text-sm text-slate-600'>
                    This repair is closed to new actions.
                  </p>
                )}
                {contractor ? (
                  order.acceptedAt ? (
                    <p className='mt-2 text-sm text-teal-900'>Accepted</p>
                  ) : (
                    order.dispatchedAt &&
                    !isClosed(order) &&
                    !decision && (
                      <button
                        type='button'
                        className={button + ' mt-3'}
                        disabled={!!pending}
                        onClick={() =>
                          setConfirmation({
                            ticketId: order.ticketId,
                            action: 'accept',
                          })
                        }
                      >
                        Review acceptance
                      </button>
                    )
                  )
                ) : (
                  <>
                    {order.decision && (
                      <p className='mt-2 text-sm text-teal-900'>
                        {order.decision === 'approved'
                          ? 'Approved'
                          : 'Declined'}
                      </p>
                    )}
                    {ready && !decision && (
                      <div className='mt-3 flex flex-wrap gap-2'>
                        <button
                          type='button'
                          className={button}
                          disabled={!!pending}
                          onClick={() =>
                            setConfirmation({
                              ticketId: order.ticketId,
                              action: 'approve',
                            })
                          }
                        >
                          Review approval
                        </button>
                        <button
                          type='button'
                          className={secondary}
                          disabled={!!pending}
                          onClick={() =>
                            setConfirmation({
                              ticketId: order.ticketId,
                              action: 'reject',
                            })
                          }
                        >
                          Review decline
                        </button>
                      </div>
                    )}
                  </>
                )}
                {decision && (
                  <div className='mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm'>
                    <p>
                      {decision === 'accept'
                        ? 'Accept this private work order?'
                        : decision === 'approve'
                          ? 'Approve this exact quote?'
                          : 'Decline this exact quote?'}{' '}
                      <strong>
                        {amountLabel(order.quotePence)} · v{order.quoteVersion}
                      </strong>
                    </p>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      <button
                        type='button'
                        className={button}
                        disabled={!!pending}
                        onClick={() => void decide(order, decision)}
                      >
                        {decision === 'accept'
                          ? 'Confirm acceptance'
                          : decision === 'approve'
                            ? 'Confirm approval'
                            : 'Confirm decline'}
                      </button>
                      <button
                        type='button'
                        className={secondary}
                        disabled={!!pending}
                        onClick={() => setConfirmation(undefined)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
      </div>
    </main>
  );
}
