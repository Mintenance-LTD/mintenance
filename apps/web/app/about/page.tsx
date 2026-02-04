import AboutPageClient from './components/AboutPageClient';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us - Transforming Home Maintenance | Mintenance',
  description: "Learn about Mintenance's mission to connect homeowners with trusted contractors. Discover our story, values, and commitment to making home maintenance simple and stress-free.",
  keywords: 'about mintenance, our mission, company values, home maintenance platform, contractor network, trusted professionals',
  openGraph: {
    title: 'About Us - Transforming Home Maintenance | Mintenance',
    description: "Discover Mintenance's mission to revolutionise home maintenance through innovative technology and trusted contractor connections.",
    type: 'website',
    images: [
      {
        url: '/og-about.jpg',
        width: 1200,
        height: 630,
        alt: 'About Mintenance - Our Mission and Values',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Mintenance | Our Mission',
    description: 'Making home maintenance simple, trustworthy, and accessible through innovative technology.',
  },
};

export default function AboutPage() {
  return (
    <div>
      <LandingNavigation />
      <main id="main-content" tabIndex={-1}>
        <AboutPageClient />
      </main>
      <Footer2025 />
    </div>
  );
}
