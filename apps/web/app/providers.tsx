'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/react-query-client';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';
import { useEffect, useState } from 'react';

// Dynamically import ReactQueryDevtools to avoid hydration mismatch
const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then(
      (mod) => mod.ReactQueryDevtools
    ),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the same structure to avoid hydration mismatch.
  // The providers are client components and will work correctly on both server and client.
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmDialogProvider>
          {children}
          {/*
          react-hot-toast portal. Mounted globally because 107+ files
          across the web app `import toast from 'react-hot-toast'` and
          call `toast.success()` / `toast.error()` without ever mounting
          a <Toaster />. Without this mount those calls queue events
          that never render — silent failures across job-detail,
          settings, properties, contractor flows, etc.
          (audit-76 follow-up, 2026-05-27.)

          Coexists with the canonical `<ToastProvider>` above (which
          backs `useToast()` from `@/components/ui/Toast`) — the two
          APIs are independent, so call-sites can migrate
          incrementally without breaking either system.
        */}
          <Toaster
            position='top-center'
            toastOptions={{
              duration: 5000,
              style: {
                fontFamily: 'var(--me-font-ui)',
                background: 'var(--me-surface)',
                color: 'var(--me-ink)',
                border: '1px solid var(--me-line)',
                maxWidth: 'min(420px, calc(100vw - 32px))',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
              },
              success: {
                // Shared Mint Editorial feedback palette.
                style: {
                  background: 'var(--me-ok-bg)',
                  color: 'var(--me-ok-fg)',
                  border: '1px solid var(--me-ok-fg)',
                },
              },
              error: {
                // Mirror of `.badge-error` — see comment on success
                // above.
                style: {
                  background: 'var(--me-err-bg)',
                  color: 'var(--me-err-fg)',
                  border: '1px solid var(--me-err-fg)',
                },
              },
            }}
          />
          {mounted && process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools />
          )}
        </ConfirmDialogProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
