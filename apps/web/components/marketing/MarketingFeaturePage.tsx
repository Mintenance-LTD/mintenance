import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { LandingNavigation } from '@/app/components/landing/LandingNavigation';
import { Footer2025 } from '@/app/components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export type MarketingAccent = 'teal' | 'emerald';

export interface MarketingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  screenshot: string;
  screenshotAlt: string;
  mobileScreenshot?: string;
  mobileAlt?: string;
  badge: string;
}

export interface MarketingTrustPoint {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface MarketingFeaturePageProps {
  accent: MarketingAccent;
  hero: {
    badge: { icon: LucideIcon; label: string };
    title: string;
    highlightedWord: string;
    description: string;
    primaryCTA: { label: string; href: string };
    secondaryCTA: { label: string; href: string };
    desktopScreenshot: { src: string; alt: string };
    mobileScreenshot?: { src: string; alt: string };
  };
  stats: Array<{ value: string; label: string }>;
  featuresHeading: { title: string; description: string };
  features: MarketingFeature[];
  extraSection?: React.ReactNode;
  trust: {
    title: string;
    description: string;
    points: MarketingTrustPoint[];
  };
  finalCTA: {
    title: string;
    description: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
}

const ACCENT_CLASSES: Record<
  MarketingAccent,
  {
    heroGradient: string;
    heroOrbA: string;
    heroOrbB: string;
    highlight: string;
    badge: string;
    primaryBtn: string;
    statText: string;
    featureBadge: string;
    trustIcon: string;
    ctaGradient: string;
    ctaSub: string;
    ctaPrimaryText: string;
    ctaSecondary: string;
  }
> = {
  teal: {
    heroGradient: 'from-slate-900 via-slate-800 to-teal-900',
    heroOrbA: 'bg-teal-500',
    heroOrbB: 'bg-emerald-400',
    highlight: 'text-teal-400',
    badge: 'bg-teal-500/20 text-teal-300',
    primaryBtn:
      'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-400/30',
    statText: 'text-teal-600',
    featureBadge: 'bg-teal-50 text-teal-700',
    trustIcon: 'bg-teal-100 text-teal-600',
    ctaGradient: 'from-teal-600 to-teal-500',
    ctaSub: 'text-teal-100',
    ctaPrimaryText: 'text-teal-700 hover:bg-teal-50',
    ctaSecondary: 'bg-teal-700/50 hover:bg-teal-700/70',
  },
  emerald: {
    heroGradient: 'from-slate-900 via-slate-800 to-emerald-900',
    heroOrbA: 'bg-emerald-500',
    heroOrbB: 'bg-teal-400',
    highlight: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
    primaryBtn:
      'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30',
    statText: 'text-emerald-600',
    featureBadge: 'bg-emerald-50 text-emerald-700',
    trustIcon: 'bg-emerald-100 text-emerald-600',
    ctaGradient: 'from-emerald-600 to-teal-500',
    ctaSub: 'text-emerald-100',
    ctaPrimaryText: 'text-emerald-700 hover:bg-emerald-50',
    ctaSecondary: 'bg-emerald-700/50 hover:bg-emerald-700/70',
  },
};

export function MarketingFeaturePage({
  accent,
  hero,
  stats,
  featuresHeading,
  features,
  extraSection,
  trust,
  finalCTA,
}: MarketingFeaturePageProps) {
  const c = ACCENT_CLASSES[accent];
  const BadgeIcon = hero.badge.icon;

  return (
    <ErrorBoundary>
      <div className='min-h-screen bg-white'>
        <LandingNavigation />

        {/* Hero */}
        <section
          className={`relative overflow-hidden bg-gradient-to-br ${c.heroGradient} text-white`}
        >
          <div className='absolute inset-0 opacity-10' aria-hidden='true'>
            <div
              className={`absolute top-10 right-20 w-80 h-80 ${c.heroOrbA} rounded-full blur-3xl`}
            />
            <div
              className={`absolute bottom-20 left-10 w-96 h-96 ${c.heroOrbB} rounded-full blur-3xl`}
            />
          </div>

          <div className='relative max-w-7xl mx-auto px-6 py-24 lg:py-32'>
            <div className='grid lg:grid-cols-2 gap-16 items-center'>
              <div>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-1.5 ${c.badge} rounded-full text-sm font-medium mb-6`}
                >
                  <BadgeIcon className='w-4 h-4' />
                  {hero.badge.label}
                </span>
                <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-6'>
                  {hero.title}
                  <br />
                  <span className={c.highlight}>{hero.highlightedWord}</span>
                </h1>
                <p className='text-lg text-slate-300 mb-8 max-w-lg leading-relaxed'>
                  {hero.description}
                </p>
                <div className='flex flex-wrap gap-4'>
                  <Link
                    href={hero.primaryCTA.href}
                    className={`inline-flex items-center gap-2 px-8 py-4 ${c.primaryBtn} rounded-xl font-semibold transition-all`}
                  >
                    {hero.primaryCTA.label}
                    <ArrowRight className='w-5 h-5' />
                  </Link>
                  <Link
                    href={hero.secondaryCTA.href}
                    className='inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all backdrop-blur-sm'
                  >
                    {hero.secondaryCTA.label}
                  </Link>
                </div>
              </div>

              {/* Hero screenshot */}
              <div className='relative hidden lg:block'>
                <div className='relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hero.desktopScreenshot.src}
                    alt={hero.desktopScreenshot.alt}
                    width={800}
                    height={500}
                    className='w-full h-auto'
                    loading='eager'
                  />
                </div>
                {hero.mobileScreenshot && (
                  <div className='absolute -bottom-8 -left-12 w-48 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 rotate-[-3deg]'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hero.mobileScreenshot.src}
                      alt={hero.mobileScreenshot.alt}
                      width={240}
                      height={520}
                      className='w-full h-auto'
                      loading='lazy'
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className='bg-gray-50 border-y border-gray-200'>
          <div className='max-w-7xl mx-auto px-6 py-8'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
              {stats.map((stat) => (
                <div key={stat.label} className='text-center'>
                  <div className={`text-3xl font-bold ${c.statText}`}>
                    {stat.value}
                  </div>
                  <div className='text-sm text-gray-500 mt-1'>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features — alternating layout */}
        <section className='py-20'>
          <div className='max-w-7xl mx-auto px-6'>
            <div className='text-center mb-16'>
              <h2 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-4'>
                {featuresHeading.title}
              </h2>
              <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
                {featuresHeading.description}
              </p>
            </div>

            <div className='space-y-24'>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isReversed = index % 2 === 1;

                return (
                  <div
                    key={feature.title}
                    className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'
                  >
                    <div className={isReversed ? 'lg:order-2' : ''}>
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 ${c.featureBadge} rounded-full text-xs font-semibold uppercase tracking-wider mb-4`}
                      >
                        <Icon className='w-3.5 h-3.5' />
                        {feature.badge}
                      </span>
                      <h3 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-4'>
                        {feature.title}
                      </h3>
                      <p className='text-gray-600 leading-relaxed text-lg'>
                        {feature.description}
                      </p>
                    </div>

                    <div
                      className={`relative ${isReversed ? 'lg:order-1' : ''}`}
                    >
                      <div className='relative bg-gray-900 rounded-xl p-2 shadow-2xl'>
                        <div className='flex items-center gap-1.5 px-3 py-2'>
                          <div className='w-2.5 h-2.5 rounded-full bg-red-400' />
                          <div className='w-2.5 h-2.5 rounded-full bg-yellow-400' />
                          <div className='w-2.5 h-2.5 rounded-full bg-green-400' />
                          <div className='flex-1 mx-3 h-5 bg-gray-700 rounded-md' />
                        </div>
                        <div className='rounded-lg overflow-hidden'>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={feature.screenshot}
                            alt={feature.screenshotAlt}
                            width={700}
                            height={440}
                            className='w-full h-auto'
                            loading='lazy'
                          />
                        </div>
                      </div>

                      {feature.mobileScreenshot && (
                        <div className='absolute -bottom-6 -right-6 w-36 rounded-2xl overflow-hidden shadow-xl border-4 border-white hidden md:block'>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={feature.mobileScreenshot}
                            alt={feature.mobileAlt || ''}
                            width={180}
                            height={390}
                            className='w-full h-auto'
                            loading='lazy'
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Optional extra section (e.g. business tools grid, how-it-works) */}
        {extraSection}

        {/* Trust section */}
        <section className='py-20'>
          <div className='max-w-7xl mx-auto px-6'>
            <h2 className='text-3xl font-bold text-gray-900 text-center mb-4'>
              {trust.title}
            </h2>
            <p className='text-gray-600 text-center mb-12 max-w-2xl mx-auto'>
              {trust.description}
            </p>
            <div className='grid md:grid-cols-3 gap-8'>
              {trust.points.map((point) => {
                const Icon = point.icon;
                return (
                  <div
                    key={point.title}
                    className='bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow text-center'
                  >
                    <div
                      className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${c.trustIcon} mb-4`}
                    >
                      <Icon className='w-6 h-6' />
                    </div>
                    <h3 className='font-semibold text-gray-900 mb-2 text-lg'>
                      {point.title}
                    </h3>
                    <p className='text-gray-500 leading-relaxed'>
                      {point.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section
          className={`bg-gradient-to-r ${c.ctaGradient} text-white py-16`}
        >
          <div className='max-w-4xl mx-auto px-6 text-center'>
            <h2 className='text-3xl sm:text-4xl font-bold mb-4'>
              {finalCTA.title}
            </h2>
            <p className={`${c.ctaSub} text-lg mb-8 max-w-2xl mx-auto`}>
              {finalCTA.description}
            </p>
            <div className='flex flex-wrap gap-4 justify-center'>
              <Link
                href={finalCTA.primary.href}
                className={`inline-flex items-center gap-2 px-8 py-4 bg-white ${c.ctaPrimaryText} rounded-xl font-semibold transition-all shadow-lg`}
              >
                {finalCTA.primary.label}
                <ArrowRight className='w-5 h-5' />
              </Link>
              <Link
                href={finalCTA.secondary.href}
                className={`inline-flex items-center gap-2 px-8 py-4 ${c.ctaSecondary} text-white rounded-xl font-semibold transition-all backdrop-blur-sm`}
              >
                {finalCTA.secondary.label}
              </Link>
            </div>
          </div>
        </section>

        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}
