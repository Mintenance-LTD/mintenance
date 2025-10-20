import { SkipLink } from '../components/ui/SkipLink';
import { MobileNavigation } from '../components/ui/MobileNavigation';
import { LandingNavigation } from './components/landing/LandingNavigation';
import { HeroSection } from './components/landing/HeroSection';
import { StatsSection } from './components/landing/StatsSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { ServicesSection } from './components/landing/ServicesSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { FooterSection } from './components/landing/FooterSection';
import { CTAClient } from './components/landing/CTAClient';
import dynamic from 'next/dynamic';

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
        <StatsSectionDynamic />
        <HowItWorksSectionDynamic />
        <ServicesSectionDynamic />
        <FeaturesSectionDynamic />
        <CTAClient />
      </main>

      {/* Footer */}
      <FooterSection />
    </div>
  );
}
