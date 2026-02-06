import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test: Animations | Mintenance',
  description: 'Test page for verifying motion accessibility and reduced motion support.',
};

export default function TestAnimationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
