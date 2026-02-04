import FAQPageClient from './components/FAQPageClient';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQs - Frequently Asked Questions | Mintenance',
  description: 'Find answers to common questions about Mintenance. Learn about our platform, pricing, contractor verification, payment protection, and how to get started.',
  keywords: 'mintenance faq, help, support, platform questions, contractor verification, payment protection, getting started guide',
  openGraph: {
    title: 'FAQs - Frequently Asked Questions | Mintenance',
    description: 'Get answers to your questions about posting jobs, hiring contractors, payments, safety, and platform features.',
    type: 'website',
    images: [
      {
        url: '/og-faq.jpg',
        width: 1200,
        height: 630,
        alt: 'Mintenance FAQs and Help',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mintenance FAQs | Help Centre',
    description: 'Common questions about Mintenance platform, pricing, and features.',
  },
};

export default function FAQPage() {
  return (
    <>
      <LandingNavigation />
      <FAQPageClient />
      <Footer2025 />
    </>
  );
}
