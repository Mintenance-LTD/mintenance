import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
export const LazyComponent = dynamic(
  // @ts-expect-error - placeholder for actual heavy component
  () => import('./HeavyComponent'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded" />,
    ssr: false, // Disable SSR for heavy client-only components
  }
);

// With Suspense boundary
export function LazyWithSuspense({ componentPath }: { componentPath: string }) {
  const Component = dynamic(() => import(componentPath));

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Component />
    </Suspense>
  );
}
