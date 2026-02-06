import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Confirmation | Mintenance',
  description: 'View the status of your payment and receive confirmation for your maintenance service.',
};

export default function CheckoutReturnLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
