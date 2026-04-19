import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coming Soon | Mintenance',
  description:
    "Mintenance is launching soon — join the waitlist to be first in line for the UK's smartest home maintenance platform, with AI damage assessment, escrow-protected payments, and verified tradespeople.",
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Mintenance',
    title: 'Mintenance — Coming Soon',
    description:
      "Join the waitlist for the UK's smartest home maintenance platform. AI damage assessment, escrow payments, verified contractors.",
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
