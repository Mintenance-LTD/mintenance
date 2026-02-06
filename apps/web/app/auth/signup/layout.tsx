import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Mintenance',
  description: 'Create a free Mintenance account as a homeowner or contractor. Get matched with verified professionals for your home projects.',
};

export default function AuthSignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
