import ContactPageClient from './components/ContactPageClient';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - Get in Touch | Mintenance',
  description: "Have questions? Contact the Mintenance team. We're here to help homeowners and contractors with support, sales inquiries, and partnership opportunities.",
  keywords: 'contact mintenance, customer support, get in touch, help centre, partnership opportunities, technical support',
  openGraph: {
    title: 'Contact Us - Get in Touch | Mintenance',
    description: 'Reach out to our team for support, sales inquiries, or partnership opportunities. We respond within 24 hours.',
    type: 'website',
    images: [
      {
        url: '/og-contact.jpg',
        width: 1200,
        height: 630,
        alt: 'Contact Mintenance Support Team',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Mintenance | Support',
    description: "Have questions? We're here to help. Reach out to our support team.",
  },
};

export default function ContactPage() {
  return (
    <div>
      <LandingNavigation />
      <ContactPageClient />
      <Footer2025 />
    </div>
  );
}
