import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reviews & Ratings | Mintenance',
  description: 'View and respond to client reviews. Track your ratings and build your reputation on Mintenance.',
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
