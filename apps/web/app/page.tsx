import { SkipLink } from '../components/ui/SkipLink';
import { MobileNavigation } from '../components/ui/MobileNavigation';
import { LandingNavigation } from './components/landing/LandingNavigation';
import { HeroSection } from './components/landing/HeroSection';
import { FooterSection } from './components/landing/FooterSection';
import { CTAClient } from './components/landing/CTAClient';
import dynamic from 'next/dynamic';

// New enhancement components
import {
  TrustIndicators,
  QuickQuoteWidget,
  CustomerTestimonials,
  AIAssessmentShowcase,
  LiveActivityFeed,
  UrgencyBanner,
} from '../components/landing';

// Dynamic imports for code splitting - load non-critical sections lazily
const StatsSectionDynamic = dynamic(() => import('./components/landing/StatsSection').then(mod => ({ default: mod.StatsSection })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
});

const HowItWorksSectionDynamic = dynamic(() => import('./components/landing/HowItWorksSection').then(mod => ({ default: mod.HowItWorksSection })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
});

const ServicesSectionDynamic = dynamic(() => import('./components/landing/ServicesSection').then(mod => ({ default: mod.ServicesSection })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />
});

const FeaturesSectionDynamic = dynamic(() => import('./components/landing/FeaturesSection').then(mod => ({ default: mod.FeaturesSection })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
});

/**
 * Landing page - main entry point for the application
 * Orchestrates landing page sections using modular components
 * 
 * Enhanced with high-converting components for improved engagement:
 * - UrgencyBanner: Creates urgency with limited-time offers
 * - TrustIndicators: Builds credibility with social proof
 * - QuickQuoteWidget: Captures leads with instant estimates
 * - AIAssessmentShowcase: Demonstrates AI-powered damage assessment
 * - CustomerTestimonials: Social proof through success stories
 * - LiveActivityFeed: Creates FOMO with real-time activity
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Accessibility Skip Links */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>
      <SkipLink href="#footer">Skip to footer</SkipLink>

      {/* Urgency Banner - Top of page for maximum visibility */}
      <UrgencyBanner />

      {/* Navigation */}
      <LandingNavigation />
      <MobileNavigation
        items={[
          { label: 'How It Works', href: '#how-it-works' },
          { label: 'Services', href: '#services' },
          { label: 'Features', href: '#features' },
        ]}
        className="md:hidden"
      />

      {/* Main Content */}
      <main id="main-content">
        {/* Hero Section */}
        <HeroSection />

        {/* Trust Indicators - Immediately after hero for credibility */}
        <section className="py-12 px-4">
          <TrustIndicators />
        </section>

        {/* Stats Section */}
        <StatsSectionDynamic />

        {/* Quick Quote Widget - High visibility for lead capture */}
        <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Get Your Free Quote in 60 Seconds
              </h2>
              <p className="text-xl text-gray-600">
                No obligation, no spam - just instant estimates
              </p>
            </div>
            <QuickQuoteWidget />
          </div>
        </section>

        {/* How It Works Section */}
        <HowItWorksSectionDynamic />

        {/* AI Assessment Showcase - Highlight your technology */}
        <AIAssessmentShowcase />

        {/* Customer Testimonials - Build trust with social proof */}
        <CustomerTestimonials />

        {/* Services Section */}
        <ServicesSectionDynamic />

        {/* Features Section */}
        <FeaturesSectionDynamic />

        {/* Final CTA */}
        <CTAClient />
      </main>

      {/* Footer */}
      <FooterSection />

      {/* Live Activity Feed - Fixed position, creates FOMO */}
      <LiveActivityFeed />
    </div>
  );
}
