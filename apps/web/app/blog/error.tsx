'use client';

import { MarketingErrorBoundary } from '@/components/errors/MarketingErrorBoundary';

export default function BlogError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MarketingErrorBoundary
      {...props}
      page='Blog'
      backHref='/blog'
      backLabel='Back to blog'
    />
  );
}
