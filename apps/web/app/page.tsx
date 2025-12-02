import { SkipLink } from '../components/ui/SkipLink';
import { LandingNavigation } from './components/landing/LandingNavigation';
import { HeroSection } from './components/landing/HeroSection';
import { FeaturesSection2025 } from './components/landing/FeaturesSection2025';
import { HowItWorksSection2025 } from './components/landing/HowItWorksSection2025';
import { SocialProofSection2025 } from './components/landing/SocialProofSection2025';
import { AIAssessmentShowcase } from '@/components/landing/AIAssessmentShowcase';
import { PricingSection2025 } from './components/landing/PricingSection2025';
import { CTASection2025 } from './components/landing/CTASection2025';
import { Footer2025 } from './components/landing/Footer2025';
import { LiveActivityFeed } from '@/components/landing/LiveActivityFeed';

/**
 * Landing Page - Completely Redesigned for 2025
 *
 * Modern, sleek, and professional design optimized for conversions.
 * Features:
 * - Bold hero with search functionality and trust indicators
 * - Feature showcase with hover effects and animations
 * - Tabbed "How It Works" for homeowners and contractors
 * - Social proof with animated statistics and testimonials
 * - AI Assessment showcase with interactive demo
 * - Transparent pricing with annual billing toggle
 * - Strong CTA with no credit card messaging
 * - Comprehensive footer with newsletter and trust badges
 *
 * Design System:
 * - Primary Blue: #0066CC
 * - Secondary Orange: #10B981
 * - Smooth animations with reduced motion support
 * - Mobile-first responsive design
 * - WCAG 2.2 AA accessibility
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Accessibility Skip Links */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>
      <SkipLink href="#footer">Skip to footer</SkipLink>

      {/* Navigation */}
      <LandingNavigation />

      {/* Main Content */}
      <main id="main-content">
        {/* Hero Section - Full viewport with search */}
        <HeroSection />

        {/* Features Section - Unique platform features */}
        <FeaturesSection2025 />

        {/* How It Works - Tabbed for homeowners/contractors */}
        <HowItWorksSection2025 />

        {/* Social Proof - Stats, testimonials, live feed */}
        <SocialProofSection2025 />

        {/* AI Assessment Showcase - Interactive demo */}
        <AIAssessmentShowcase />

        {/* Pricing Section - Transparent plans */}
        <PricingSection2025 />

        {/* Final CTA - Strong conversion section */}
        <CTASection2025 />
      </main>

      {/* Footer - Comprehensive navigation and trust signals */}
      <footer id="footer">
        <Footer2025 />
      </footer>

      {/* Live Activity Feed - Fixed position, creates FOMO */}
      <LiveActivityFeed />
    </div>
  );
}

