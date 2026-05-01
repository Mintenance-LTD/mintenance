'use client';

import { MarketingErrorBoundary } from '@/components/errors/MarketingErrorBoundary';

export default function ForContractorsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <MarketingErrorBoundary {...props} page='For Contractors' />;
}
