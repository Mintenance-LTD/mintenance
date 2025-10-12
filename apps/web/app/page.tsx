'use client';

import { SkipLink } from '../components/ui/SkipLink';
import { MobileNavigation } from '../components/ui/MobileNavigation';
import { LandingNavigation } from './components/landing/LandingNavigation';
import { HeroSection } from './components/landing/HeroSection';
import { StatsSection } from './components/landing/StatsSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { ServicesSection } from './components/landing/ServicesSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { CTASection } from './components/landing/CTASection';
import { FooterSection } from './components/landing/FooterSection';

/**
 * Landing page - main entry point for the application
 * Orchestrates landing page sections using modular components
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
        <HeroSection />
        <StatsSection />
        <HowItWorksSection />
        <ServicesSection />
        <FeaturesSection />
        <CTASection />
      </main>

      {/* Footer */}
      <FooterSection />
    </div>
  );
}
