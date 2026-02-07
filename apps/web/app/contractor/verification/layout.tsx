import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verification Center | Mintenance',
  description: 'Complete your profile verification to unlock full access. Upload documents and get verified.',
};

export default function VerificationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
