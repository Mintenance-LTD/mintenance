'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import {
  mediationResponseSchema,
  type MediationState,
} from '@/lib/disputes/mediation-contract';

export function useMediationRequest(
  escrowId: string,
  onUpdated: (state: MediationState) => void
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const version = generation.current + 1;
    generation.current = version;
    inFlight.current = false;
    setPending(false);
    setError(null);
    return () => {
      generation.current = version + 1;
    };
  }, [escrowId]);
  async function request() {
    if (inFlight.current) return;
    const version = generation.current;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetchWithCsrf(
        `/api/disputes/${encodeURIComponent(escrowId)}/mediation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request' }),
        }
      );
      const body = await response.json().catch(() => null);
      if (generation.current !== version) return;
      const parsed = mediationResponseSchema.safeParse(body?.mediation);
      if (
        !response.ok ||
        response.status === 202 ||
        body?.success !== true ||
        !parsed.success ||
        parsed.data.escrowId !== escrowId ||
        !parsed.data.requestedAt
      ) {
        throw new Error(
          typeof body?.error === 'string'
            ? body.error
            : body?.error?.message ||
                'Mediation could not be confirmed. Please retry.'
        );
      }
      onUpdated(parsed.data);
    } catch (cause) {
      if (generation.current === version)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to request mediation. Please retry.'
        );
    } finally {
      if (generation.current === version) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }
  return { request, pending, error };
}
