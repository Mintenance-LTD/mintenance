import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test: Verification | Mintenance',
  description: 'Test page for verifying contractor verification badges, DBS checks, and profile boost components.',
};

export default function TestVerificationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
