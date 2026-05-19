import Link from 'next/link';
import {
  Shield,
  CheckCircle,
  BarChart3,
  Award,
  FileCheck,
  Building2,
  MapPin,
  FileText,
} from 'lucide-react';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contractor Verification - Get Verified | Mintenance',
  description:
    'Get verified as a trusted contractor on Mintenance. Increase your visibility, win more jobs, and build trust with homeowners through our verification process.',
  keywords:
    'contractor verification, verified badge, trusted contractors, background check, business verification, contractor credentials',
  openGraph: {
    title: 'Contractor Verification - Get Verified | Mintenance',
    description:
      'Get verified as a trusted contractor. Increase visibility, win more jobs, and build trust with homeowners.',
    type: 'website',
    images: [
      {
        url: '/og-verification.jpg',
        width: 1200,
        height: 630,
        alt: 'Mintenance Contractor Verification',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contractor Verification | Mintenance',
    description: 'Get verified to increase visibility and win more jobs.',
  },
};

const WHY_WE_VERIFY = [
  {
    title: 'Safety for homeowners',
    description:
      'Homeowners can see that a contractor has provided a real business name, address, and licence so they can hire with confidence.',
    icon: Shield,
  },
  {
    title: 'Fair and transparent',
    description:
      'We check company details and business address, validate licence format, and only award the verified badge after review.',
    icon: CheckCircle,
  },
  {
    title: 'Better matches',
    description:
      'Verified contractors are easier for homeowners to find and trust, so you get more relevant opportunities.',
    icon: BarChart3,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    id: 'company',
    title: 'Company name',
    description:
      "You provide your registered or trading business name. We check it's real and not a placeholder.",
    icon: Building2,
    required: true,
  },
  {
    id: 'address',
    title: 'Business address',
    description:
      'You enter your business address. We validate it and use it to show your location on the map (geocoding).',
    icon: MapPin,
    required: true,
  },
  {
    id: 'license',
    title: 'Licence number',
    description:
      'You enter your trade or business licence number. We validate the format; our team may use it as part of review.',
    icon: Award,
    required: true,
  },
  {
    id: 'insurance',
    title: 'Insurance (optional)',
    description:
      "You can add liability insurance provider, policy number, and expiry. It's optional but strengthens your profile and can help with verification.",
    icon: FileText,
    required: false,
  },
  {
    id: 'review',
    title: 'Our review',
    description:
      'Our team reviews your details. We may run automated checks (e.g. address, licence format). Approved contractors get the verified badge.',
    icon: CheckCircle,
    required: false,
  },
];

const BENEFITS = [
  {
    title: 'Build trust',
    description:
      "The verified badge shows homeowners you've provided and had your business details checked.",
    icon: CheckCircle,
  },
  {
    title: 'More opportunities',
    description:
      'Many homeowners filter or prefer verified contractors, so you can get more relevant jobs.',
    icon: BarChart3,
  },
  {
    title: 'Priority in search',
    description:
      'Verified contractors can appear higher in search results and on the map.',
    icon: Award,
  },
];

export default function VerificationPage() {
  return (
    <ErrorBoundary componentName='VerificationPage'>
      <div>
        <LandingNavigation />
        <div
          data-theme='mint-editorial'
          className='min-h-screen'
          style={{
            background: 'var(--me-bg)',
            fontFamily: 'var(--me-font-body)',
          }}
        >
          <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
            <div className='text-center mb-12'>
              <div
                className='inline-flex p-4 mb-6'
                style={{
                  borderRadius: 'var(--me-radius-card)',
                  background: 'var(--me-brand-soft)',
                }}
              >
                <Shield
                  className='w-12 h-12'
                  style={{ color: 'var(--me-brand)' }}
                  aria-hidden='true'
                />
              </div>
              <h1
                className='mb-4'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  fontSize: 'clamp(32px, 4.5vw, 44px)',
                  letterSpacing: '-0.02em',
                  color: 'var(--me-ink)',
                }}
              >
                Contractor Verification
              </h1>
              <p
                className='text-lg max-w-2xl mx-auto'
                style={{ color: 'var(--me-ink-2)' }}
              >
                We verify contractor business details so homeowners can hire
                with confidence. Below we explain why we do it and how it works.
              </p>
            </div>

            <section
              className='p-8 mb-10'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              <h2
                className='mb-6'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  fontSize: 26,
                  letterSpacing: '-0.02em',
                  color: 'var(--me-ink)',
                }}
              >
                Why we verify
              </h2>
              <p className='mb-6' style={{ color: 'var(--me-ink-2)' }}>
                Verification helps homeowners know they're hiring a real
                business. We check company name, business address, and licence
                information so that when you see the verified badge, it means
                we've reviewed those details. We do it to keep the platform
                safe, fair, and trustworthy for everyone.
              </p>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                {WHY_WE_VERIFY.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className='flex items-start gap-3'>
                      <Icon
                        className='w-6 h-6 flex-shrink-0 mt-1'
                        style={{ color: 'var(--me-brand)' }}
                        aria-hidden='true'
                      />
                      <div>
                        <h3
                          className='font-bold mb-1'
                          style={{ color: 'var(--me-ink)' }}
                        >
                          {item.title}
                        </h3>
                        <p
                          className='text-sm'
                          style={{ color: 'var(--me-ink-2)' }}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              className='p-8 mb-10'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              <h2
                className='mb-6'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  fontSize: 26,
                  letterSpacing: '-0.02em',
                  color: 'var(--me-ink)',
                }}
              >
                How it works
              </h2>
              <p className='mb-6' style={{ color: 'var(--me-ink-2)' }}>
                Contractors submit their business details in the verification
                centre. We validate the information (including address geocoding
                and licence format) and our team reviews it. Approved
                contractors receive the verified badge.
              </p>
              <ul className='space-y-6'>
                {HOW_IT_WORKS_STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <li
                      key={step.id}
                      className='flex items-start gap-4 p-4'
                      style={{
                        borderRadius: 'var(--me-radius-card)',
                        background: 'var(--me-bg-2)',
                        border: '1px solid var(--me-line)',
                      }}
                    >
                      <Icon
                        className='w-6 h-6 flex-shrink-0 mt-0.5'
                        style={{ color: 'var(--me-brand)' }}
                        aria-hidden='true'
                      />
                      <div>
                        <div className='flex items-center gap-2 mb-1'>
                          <h3
                            className='font-bold'
                            style={{ color: 'var(--me-ink)' }}
                          >
                            {step.title}
                          </h3>
                          {step.required && (
                            <span
                              className='px-2 py-0.5 rounded text-xs font-semibold'
                              style={{
                                background: 'var(--me-err-bg)',
                                color: 'var(--me-err-fg)',
                              }}
                            >
                              Required
                            </span>
                          )}
                        </div>
                        <p
                          className='text-sm'
                          style={{ color: 'var(--me-ink-2)' }}
                        >
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className='mt-4 text-sm' style={{ color: 'var(--me-ink-2)' }}>
                Our team reviews submissions and may run additional checks. Once
                approved, you get the verified badge; we'll notify you of the
                outcome.
              </p>
            </section>

            <section
              className='p-8 mb-10'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              <h2
                className='mb-6'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  fontSize: 26,
                  letterSpacing: '-0.02em',
                  color: 'var(--me-ink)',
                }}
              >
                Why get verified?
              </h2>
              <p className='mb-6' style={{ color: 'var(--me-ink-2)' }}>
                Verified contractors stand out to homeowners and can get more
                visibility and opportunities on the platform.
              </p>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                {BENEFITS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className='flex items-start gap-3'>
                      <Icon
                        className='w-6 h-6 flex-shrink-0 mt-1'
                        style={{ color: 'var(--me-brand)' }}
                        aria-hidden='true'
                      />
                      <div>
                        <h3
                          className='font-bold mb-1'
                          style={{ color: 'var(--me-ink)' }}
                        >
                          {item.title}
                        </h3>
                        <p
                          className='text-sm'
                          style={{ color: 'var(--me-ink-2)' }}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              className='p-8 text-center'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              <FileCheck
                className='w-12 h-12 mx-auto mb-4'
                style={{ color: 'var(--me-brand)' }}
                aria-hidden='true'
              />
              <h2
                className='mb-2'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  fontSize: 22,
                  letterSpacing: '-0.01em',
                  color: 'var(--me-ink)',
                }}
              >
                Ready to get verified?
              </h2>
              <p
                className='mb-6 max-w-md mx-auto'
                style={{ color: 'var(--me-ink-2)' }}
              >
                Create a contractor account and complete verification in your
                dashboard.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <Link
                  href='/register?role=contractor'
                  className='inline-flex items-center justify-center px-6 py-3 font-semibold transition-colors'
                  style={{
                    borderRadius: 'var(--me-radius-btn)',
                    background: 'var(--me-brand)',
                    color: 'var(--me-on-brand)',
                    boxShadow: 'var(--me-shadow-btn)',
                  }}
                >
                  Create contractor account
                </Link>
                <Link
                  href='/login?redirect=/contractor/verification'
                  className='inline-flex items-center justify-center px-6 py-3 font-semibold transition-colors'
                  style={{
                    borderRadius: 'var(--me-radius-btn)',
                    border: '1px solid var(--me-line)',
                    background: 'var(--me-surface)',
                    color: 'var(--me-ink)',
                  }}
                >
                  Log in to complete verification
                </Link>
              </div>
            </section>
          </div>
        </div>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}
