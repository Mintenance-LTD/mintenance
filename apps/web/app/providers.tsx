'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { queryClient } from '@/lib/react-query-client';
import { ToastProvider } from '@/components/ui/Toast';
import { useEffect, useState } from 'react';

// Dynamically import ReactQueryDevtools to avoid hydration mismatch
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the same structure to avoid hydration mismatch
  // The providers are client components and will work correctly on both server and client
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        {mounted && process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </ToastProvider>
    </QueryClientProvider>
  );
}