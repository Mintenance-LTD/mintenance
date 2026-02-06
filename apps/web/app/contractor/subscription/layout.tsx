import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subscription Plans | Mintenance',
  description: 'Choose the right subscription plan for your contracting business. Free forever with paid upgrades.',
};

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
