'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/react-query-client';
import { ToastProvider } from '@/components/ui/Toast';
import { useEffect, useState } from 'react';
import { SentryInit } from './sentry-init';

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
  // SentryInit is a no-render side-effect mount — see sentry-init.tsx for rationale.
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SentryInit />
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
              fontFamily: 'var(--font-inter)',
              borderRadius: '0.75rem',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
            },
            success: {
              // Uses the design-system success palette
              // (--success-light / --success-dark) defined in
              // apps/web/styles/professional-design-system.css so the
              // Toaster matches `.badge-success` and respects future
              // theme changes.
              style: {
                background: 'var(--success-light)',
                color: 'var(--success-dark)',
                border: '1px solid var(--success)',
              },
            },
            error: {
              // Mirror of `.badge-error` — see comment on success
              // above.
              style: {
                background: 'var(--error-light)',
                color: 'var(--error-dark)',
                border: '1px solid var(--error)',
              },
            },
          }}
        />
        {mounted && process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools />
        )}
      </ToastProvider>
    </QueryClientProvider>
  );
}
