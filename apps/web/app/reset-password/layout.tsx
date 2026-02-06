import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set New Password | Mintenance',
  description: 'Create a new password for your Mintenance account. Your reset link is valid for one hour.',
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
