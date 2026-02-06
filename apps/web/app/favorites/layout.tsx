import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Favorite Contractors | Mintenance',
  description: 'View and manage your saved favorite contractors for quick access to trusted professionals.',
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
