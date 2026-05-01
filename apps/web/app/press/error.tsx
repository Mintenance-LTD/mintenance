'use client';

import { MarketingErrorBoundary } from '@/components/errors/MarketingErrorBoundary';

export default function PressError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <MarketingErrorBoundary {...props} page='Press' />;
}
