import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contractor Profile | Mintenance',
  description: 'View contractor profile, reviews, portfolio, and request a quote on Mintenance.',
};

export default function ContractorProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
