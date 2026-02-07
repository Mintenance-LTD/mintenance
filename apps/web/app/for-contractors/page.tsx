import Link from 'next/link';
import {
  Briefcase, CheckCircle, Shield, PoundSterling,
  TrendingUp, MapPin, Star, Award, Sparkles, UserPlus,
} from 'lucide-react';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Contractors - Grow Your Trade Business | Mintenance',
  description:
    'Join thousands of verified tradespeople across the UK. Get matched with homeowners, manage jobs, and get paid securely through Mintenance.',
  keywords:
    'contractor platform, tradesperson jobs, find work UK, verified contractor, secure payments, escrow, property maintenance jobs',
  openGraph: {
    title: 'For Contractors - Grow Your Trade Business | Mintenance',
    description:
      'Join thousands of verified tradespeople. Get matched with homeowners, manage jobs, and get paid securely.',
    type: 'website',
    images: [{ url: '/og-contractors.jpg', width: 1200, height: 630, alt: 'Mintenance for Contractors' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For Contractors | Mintenance',
    description: 'Grow your trade business with verified jobs, secure payments, and AI-powered matching.',
  },
};

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Create your profile',
    description:
      'Set up your business profile, add your services, coverage area, and portfolio to showcase your best work.',
    icon: UserPlus,
  },
  {
    step: 2,
    title: 'Get matched with jobs',
    description:
      'Receive job notifications in your area. Browse and bid on projects that match your skills and availability.',
    icon: MapPin,
  },
  {
    step: 3,
    title: 'Complete jobs and get paid',
    description:
      'Deliver quality work, collect reviews, and receive secure payments through our escrow system.',
    icon: PoundSterling,
  },
];

const BENEFITS = [
  {
    title: 'Verified jobs from real homeowners',
    description: 'Every job posting is verified. No cold calling, no wasted time chasing leads that go nowhere.',
    icon: CheckCircle,
  },
  {
    title: 'Secure payments via escrow',
    description:
      'Funds are held in escrow until the job is completed and approved. No more chasing invoices.',
    icon: Shield,
  },
  {
    title: 'Build your reputation',
    description:
      'Collect verified reviews and build a professional profile that wins you more work over time.',
    icon: Star,
  },
  {
    title: 'AI-powered matching',
    description:
      'Our Mint AI technology matches you with the right jobs based on your skills, experience, and location.',
    icon: Sparkles,
  },
];

const PRICING_TIERS = [
  { name: 'Basic', price: 'Free', fee: '15% platform fee', highlight: false },
  { name: 'Professional', price: '\u00A329/mo', fee: '10% platform fee', highlight: true },
  { name: 'Business', price: '\u00A399/mo', fee: '7% platform fee', highlight: false },
];

export default function ForContractorsPage() {
  return (
    <ErrorBoundary componentName="ForContractorsPage">
      <div>
        <LandingNavigation />
        <main id="main-content" tabIndex={-1}>
          <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <section className="bg-white border-b border-gray-200 pt-24 pb-16">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-teal-50 mb-6">
                  <Briefcase className="w-12 h-12 text-teal-600" aria-hidden="true" />
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                  Grow Your Trade Business with Mintenance
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                  Join thousands of verified tradespeople across the UK. Get matched with homeowners,
                  manage jobs, and get paid securely.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register?type=contractor"
                    className="inline-flex items-center justify-center rounded-lg bg-[#1F2937] text-white px-8 py-3 font-semibold hover:bg-[#374151] transition-colors"
                  >
                    Create contractor account
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 text-gray-700 px-8 py-3 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {HOW_IT_WORKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold text-sm mb-4">
                        {item.step}
                      </div>
                      <Icon className="w-8 h-8 text-teal-600 mx-auto mb-3" aria-hidden="true" />
                      <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Why Mintenance */}
            <section className="bg-white border-y border-gray-200 py-16">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Why Mintenance</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {BENEFITS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1" aria-hidden="true" />
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                          <p className="text-gray-600 text-sm">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Pricing Snapshot */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Contractor pricing</h2>
              <p className="text-gray-600 text-center mb-8">
                Simple, transparent plans. Start free and upgrade as your business grows.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {PRICING_TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className={`rounded-2xl border p-6 text-center ${
                      tier.highlight
                        ? 'border-teal-500 bg-teal-50 shadow-md'
                        : 'border-gray-200 bg-white shadow-sm'
                    }`}
                  >
                    <h3 className="font-bold text-gray-900 mb-1">{tier.name}</h3>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{tier.price}</p>
                    <p className="text-sm text-gray-600">{tier.fee}</p>
                  </div>
                ))}
              </div>
              <p className="text-center">
                <Link href="/pricing" className="text-teal-600 font-semibold hover:underline">
                  View full pricing details
                </Link>
              </p>
            </section>

            {/* Verification Badge */}
            <section className="bg-white border-y border-gray-200 py-16">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <Award className="w-12 h-12 text-teal-600 mx-auto mb-4" aria-hidden="true" />
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Get verified and stand out</h2>
                <p className="text-gray-600 max-w-2xl mx-auto mb-4">
                  Verified contractors appear higher in search results and are preferred by homeowners.
                  Complete our verification process to earn the trusted badge and win more work.
                </p>
                <Link href="/verification" className="text-teal-600 font-semibold hover:underline">
                  Learn about verification
                </Link>
              </div>
            </section>

            {/* Bottom CTA */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
              <TrendingUp className="w-12 h-12 text-teal-600 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to grow your business?</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create your free contractor account today and start receiving job matches in your area.
              </p>
              <Link
                href="/register?type=contractor"
                className="inline-flex items-center justify-center rounded-lg bg-[#1F2937] text-white px-8 py-3 font-semibold hover:bg-[#374151] transition-colors"
              >
                Create contractor account
              </Link>
            </section>
          </div>
        </main>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}
