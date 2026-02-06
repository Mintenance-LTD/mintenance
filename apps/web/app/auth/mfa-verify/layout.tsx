import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Two-Factor Authentication | Mintenance',
  description: 'Complete two-factor authentication to securely access your Mintenance account.',
};

export default function AuthMfaVerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
