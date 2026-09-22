'use client';

import { useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { requireConfirmedDisputeAction } from './dispute-action-response';
import type { Resolution } from './DisputesTable';

type Action =
  | {
      kind: 'resolve';
      body: { escrowId: string; decision: Resolution; reason: string };
    }
  | { kind: 'hold'; body: { escrowId: string; reason: string } };

interface Callbacks {
  onConfirmed: (kind: Action['kind']) => void;
  onError: (message: string) => void;
}

/** Retain the exact request across MFA; never recompute a money decision on retry. */
export function useDisputeActions({ onConfirmed, onError }: Callbacks) {
  const [loading, setLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const inFlight = useRef(false);
  const parked = useRef<Action | null>(null);

  async function submit(action: Action) {
    if (inFlight.current || parked.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const response = await fetchWithCsrf(
        action.kind === 'resolve'
          ? '/api/admin/disputes/resolve'
          : '/api/admin/escrow/hold',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.body),
        }
      );
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      if (response.status === 403 && body?.requiresStepUp === true) {
        parked.current = { ...action, body: { ...action.body } } as Action;
        setRequiresVerification(true);
        return;
      }
      if (action.kind === 'resolve')
        await requireConfirmedDisputeAction(response);
      else if (
        !response.ok ||
        response.status === 202 ||
        body?.success !== true ||
        body.escrowId !== action.body.escrowId
      ) {
        const message =
          typeof body?.error === 'string' ? body.error : body?.error?.message;
        throw new Error(
          typeof message === 'string'
            ? message
            : 'The hold was not confirmed. Please retry.'
        );
      }
      onConfirmed(action.kind);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Action could not be confirmed. Please retry.'
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  function cancelVerification() {
    parked.current = null;
    setRequiresVerification(false);
  }

  function resumeAfterVerification() {
    const action = parked.current;
    parked.current = null;
    setRequiresVerification(false);
    if (action) void submit(action);
  }

  return {
    submit,
    loading,
    requiresVerification,
    cancelVerification,
    resumeAfterVerification,
  };
}
