import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | Mintenance',
  description: 'Forgot your password? Request a password reset link to regain access to your Mintenance account.',
};

export default function AuthForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
