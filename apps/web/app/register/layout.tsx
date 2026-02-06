import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account | Mintenance',
  description: 'Join Mintenance as a homeowner or contractor. Connect with verified professionals and manage home maintenance projects.',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
