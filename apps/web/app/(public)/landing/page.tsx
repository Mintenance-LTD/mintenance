import React from 'react';
import Image from 'next/image';
import { Metadata } from 'next';
import { SearchBar, ListingCard, ContractorCard, Badge, Button } from '@/components/airbnb-system';
import { getFeaturedContractors, getPlatformStats } from '@/lib/queries/airbnb-optimized';
import { Star, CheckCircle, TrendingUp, Users, Briefcase } from 'lucide-react';
import { LocalBusinessStructuredData, WebApplicationStructuredData } from '@/components/StructuredData';
import { logger } from '@mintenance/shared';

// Force dynamic rendering - this page has interactive elements and live data
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mintenance - Find Trusted Local Contractors for Home Maintenance',
  description: 'Connect with verified contractors for all your home maintenance needs. Get instant quotes, read reviews, and hire trusted professionals.',
  keywords: 'contractors, home maintenance, home repair, plumber, electrician, handyman, home improvement, contractor near me, trusted contractors, verified professionals',

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://mintenance.com',
    siteName: 'Mintenance',
    title: 'Mintenance - Find Trusted Local Contractors for Home Maintenance',
    description: 'Connect with verified contractors. Get instant quotes, compare prices, and hire trusted professionals for your home maintenance needs.',
    images: [
      {
        url: 'https://mintenance.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mintenance - Your trusted home maintenance platform',
      }
    ],
  },

  // Twitter Cards
  twitter: {
    card: 'summary_large_image',
    site: '@mintenance',
    creator: '@mintenance',
    title: 'Mintenance - Find Trusted Local Contractors',
    description: 'Connect with verified contractors for all your home maintenance needs. Get instant quotes and hire trusted professionals.',
    images: ['https://mintenance.com/twitter-card.jpg'],
  },

  // Additional SEO
  alternates: {
    canonical: 'https://mintenance.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-verification-token',
    yandex: 'yandex-verification-token',
  },
  category: 'Home Services',
};

// Static generation with ISR for better SEO and performance
export const revalidate = 3600; // Revalidate every hour

export default async function LandingPage() {
  // Fetch real data
  const [featuredContractors, platformStats] = await Promise.all([
    getFeaturedContractors(8),
    getPlatformStats()
  ]);

  return (
    <>
      <LocalBusinessStructuredData />
      <WebApplicationStructuredData />
      <div className="min-h-screen bg-white">
        {/* Hero Section - Full Viewport */}
      <section className="relative h-[600px] md:h-[700px] flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070"
            alt="Modern home"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-white text-5xl md:text-6xl font-bold mb-4 tracking-tight animate-fade-in">
            Find trusted contractors
          </h1>
          <p className="text-white/90 text-xl md:text-2xl mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Connect with verified professionals for your home maintenance needs
          </p>

          {/* Search Bar */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <SearchBar
              variant="hero"
              onSearch={(params) => {
                const query = new URLSearchParams();
                if (params.service) query.set('service', params.service);
                if (params.location) query.set('location', params.location);
                if (params.date) query.set('date', params.date);
                window.location.href = `/contractors?${query.toString()}`;
              }}
            />
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-white/90 text-sm animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Verified professionals</span>
            </div>
            {platformStats.averageRating > 0 && (
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current" />
                <span>{platformStats.averageRating} average rating</span>
              </div>
            )}
            {platformStats.totalContractors > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>{platformStats.totalContractors} contractors</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Platform Stats - Only shown when real data exists */}
      {(platformStats.totalContractors > 0 || platformStats.totalJobs > 0 || platformStats.totalHomeowners > 0) && (
      <section className="py-16 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {platformStats.totalContractors > 0 && (
            <div className="text-center animate-slide-up">
              <div className="text-4xl md:text-5xl font-bold text-teal-500 mb-2">
                {platformStats.totalContractors.toLocaleString()}
              </div>
              <div className="text-gray-600 text-sm md:text-base">Contractors</div>
            </div>
            )}
            {platformStats.totalJobs > 0 && (
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-4xl md:text-5xl font-bold text-teal-500 mb-2">
                {platformStats.totalJobs.toLocaleString()}
              </div>
              <div className="text-gray-600 text-sm md:text-base">Jobs Posted</div>
            </div>
            )}
            {platformStats.averageRating > 0 && (
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-4xl md:text-5xl font-bold text-teal-500 mb-2">
                {platformStats.averageRating}
              </div>
              <div className="text-gray-600 text-sm md:text-base">Average Rating</div>
            </div>
            )}
            {platformStats.totalHomeowners > 0 && (
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-4xl md:text-5xl font-bold text-teal-500 mb-2">
                {platformStats.totalHomeowners.toLocaleString()}
              </div>
              <div className="text-gray-600 text-sm md:text-base">Homeowners</div>
            </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Featured Contractors */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Header */}
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Featured contractors
            </h2>
            <p className="text-gray-600 text-lg">
              Top-rated professionals ready to help with your project
            </p>
          </div>

          {/* Contractors Grid */}
          {featuredContractors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
              {featuredContractors.map((contractor) => (
                <ContractorCard
                  key={contractor.id}
                  id={contractor.id}
                  name={contractor.name}
                  image={contractor.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contractor.name)}&background=14b8a6&color=fff&size=200`}
                  category={contractor.company_name || 'General Contractor'}
                  rating={contractor.rating}
                  reviewCount={contractor.review_count}
                  hourlyRate={String(contractor.hourly_rate || 50)}
                  isVerified={contractor.verified}
                  skills={contractor.skills.slice(0, 3)}
                  location="London, UK"
                  onClick={(id) => {
                    window.location.href = `/contractors/${id}`;
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No featured contractors available at the moment
            </div>
          )}

          {/* View All Button */}
          {featuredContractors.length > 0 && (
            <div className="mt-12 text-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  window.location.href = '/contractors';
                }}
              >
                Browse all contractors
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              How Mintenance works
            </h2>
            <p className="text-gray-600 text-lg">
              Get your project done in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center animate-slide-up">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                1. Post your job
              </h3>
              <p className="text-gray-600">
                Describe your project and let contractors know what you need done
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                2. Review proposals
              </h3>
              <p className="text-gray-600">
                Compare bids from verified contractors and choose the best fit
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                3. Get it done
              </h3>
              <p className="text-gray-600">
                Work with your chosen contractor and track progress every step
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                window.location.href = '/jobs/create';
              }}
            >
              Post a job for free
            </Button>
          </div>
        </div>
      </section>

      {/* Homeowner Plan Snapshot */}
      <section className="py-16 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-2xl border border-teal-100 bg-teal-50/60 p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 text-center">
              Homeowner Plan Snapshot
            </h2>
            <p className="text-gray-700 text-center mb-6">
              Free profile includes unlimited job posts, up to 5 bids per job, and up to 3 saved properties.
              Premium unlocks unlimited properties and Portfolio Mode for landlord/agent workflows.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-white p-4 border border-gray-100">
                <p className="text-2xl font-bold text-teal-600">Unlimited</p>
                <p className="text-sm text-gray-600">Job posts</p>
              </div>
              <div className="rounded-xl bg-white p-4 border border-gray-100">
                <p className="text-2xl font-bold text-teal-600">5</p>
                <p className="text-sm text-gray-600">Bids per job (free)</p>
              </div>
              <div className="rounded-xl bg-white p-4 border border-gray-100">
                <p className="text-2xl font-bold text-teal-600">3</p>
                <p className="text-sm text-gray-600">Saved properties (free)</p>
              </div>
            </div>
            <p className="mt-5 text-sm text-gray-600 text-center">
              Launch offer: first 30 homeowners get full premium features.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Image */}
            <div className="relative h-[400px] rounded-2xl overflow-hidden animate-fade-in">
              <Image
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070"
                alt="Contractor at work"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Content */}
            <div className="animate-slide-up">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Trust & Safety guaranteed
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-teal-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Verified Professionals
                    </h3>
                    <p className="text-gray-600">
                      Every contractor is background-checked and verified before joining our platform
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <Star className="w-6 h-6 text-teal-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Reviewed Work
                    </h3>
                    <p className="text-gray-600">
                      Read reviews from real homeowners and see contractor portfolios before hiring
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-teal-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Payment Protection
                    </h3>
                    <p className="text-gray-600">
                      Secure payment system ensures you only pay when the job is done to your satisfaction
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    window.location.href = '/about';
                  }}
                >
                  Learn more about us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-teal-500 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-white/90 text-xl mb-10">
            Join homeowners who trust Mintenance for their home projects
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                window.location.href = '/register?role=homeowner';
              }}
              style={{
                backgroundColor: 'white',
                color: '#14b8a6',
                border: 'none'
              }}
            >
              I'm a homeowner
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                window.location.href = '/register?role=contractor';
              }}
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                borderColor: 'white'
              }}
            >
              I'm a contractor
            </Button>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
