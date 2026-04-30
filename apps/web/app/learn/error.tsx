'use client';

import { MarketingErrorBoundary } from '@/components/errors/MarketingErrorBoundary';

export default function LearnError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MarketingErrorBoundary
      {...props}
      page='Learn'
      backHref='/learn'
      backLabel='Back to learn'
    />
  );
}
