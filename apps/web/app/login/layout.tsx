import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Mintenance',
  description: 'Sign in to your Mintenance account to manage projects, message contractors, and track home maintenance.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
