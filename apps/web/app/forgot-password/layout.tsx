import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | Mintenance',
  description: 'Reset your Mintenance password. Enter your email to receive a secure password reset link.',
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
