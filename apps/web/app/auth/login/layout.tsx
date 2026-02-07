import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Mintenance',
  description: 'Sign in to your Mintenance account to manage home maintenance projects and connect with verified contractors.',
};

export default function AuthLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
