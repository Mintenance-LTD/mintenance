import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coming Soon | Mintenance',
  description:
    'Mintenance is launching soon — join the waitlist for a modern UK home maintenance platform with AI-assisted damage assessment, escrow-protected payments, and a curated tradesperson network.',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Mintenance',
    title: 'Mintenance — Coming Soon',
    description:
      'Join the waitlist for a modern UK home maintenance platform. AI-assisted assessment, escrow payments, curated tradespeople.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@mintenance',
    title: 'Mintenance — Coming Soon',
    description:
      "Join the waitlist for the UK's smartest home maintenance platform.",
  },
};

export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
