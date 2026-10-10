'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';

const AdminVerificationContext = createContext<(() => Promise<boolean>) | null>(null);
export function AdminVerificationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (!verified) return;
    const timer = setTimeout(() => setVerified(false), 15 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [verified]);
  const pending = useRef<((result: boolean) => void) | null>(null);
  const request = useCallback(() => {
    if (pending.current) return Promise.resolve(false);
    setVerified(false);
    setOpen(true);
    return new Promise<boolean>(resolve => { pending.current = resolve; });
  }, []);
  const finish = (success: boolean) => {
    setOpen(false);
    setVerified(success);
    pending.current?.(success);
    pending.current = null;
  };
  useEffect(() => () => { pending.current?.(false); pending.current = null; }, []);
  return <AdminVerificationContext.Provider value={request}>
    <div className='admin-verification-bar'>
      <span>{verified ? 'Identity confirmed for this session check.' : 'Sensitive actions require a recent identity check.'}</span>
      <button type='button' onClick={() => void request()}>Confirm identity</button>
    </div>
    {children}
    {open && <MfaStepUpDialog onCancel={() => finish(false)} onSuccess={() => finish(true)} />}
  </AdminVerificationContext.Provider>;
}

/** Retry only an explicitly rejected MFA request, once, after user verification. */
export function useAdminFetch() {
  const verify = useContext(AdminVerificationContext);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  return useCallback(async (url: string, options?: RequestInit, timeoutMs?: number) => {
    const send = async () => {
      if (!timeoutMs) return fetch(url, options);
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (options?.signal?.aborted) controller.abort();
      options?.signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(abort, timeoutMs);
      try { return await fetch(url, { ...options, signal: controller.signal }); }
      finally {
        clearTimeout(timer);
        options?.signal?.removeEventListener('abort', abort);
      }
    };
    const response = await send();
    if (response.status !== 403 || !verify) return response;
    const data = await response.clone().json().catch(() => null);
    if (data?.requiresStepUp !== true) return response;
    if (!(await verify())) throw new Error('Identity check cancelled. No action was performed.');
    if (!active.current) throw new Error('Action cancelled because you left the page.');
    return send();
  }, [verify]);
}
