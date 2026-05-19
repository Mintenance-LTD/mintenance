import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Trust & Safety | Mintenance',
  description:
    'Learn how Mintenance ensures a safe and secure platform for homeowners and contractors.',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--me-surface)',
  borderRadius: 'var(--me-radius-card)',
  border: '1px solid var(--me-line)',
  boxShadow: 'var(--me-shadow-card)',
  padding: 32,
};

const cardHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--me-font-display)',
  fontWeight: 500,
  fontSize: 24,
  letterSpacing: '-0.01em',
  color: 'var(--me-ink)',
  margin: '0 0 16px',
};

export default function SafetyPage() {
  return (
    <ErrorBoundary componentName='SafetyPage'>
      <div data-theme='mint-editorial'>
        <LandingNavigation />
        <div
          className='min-h-screen'
          style={{
            background: 'var(--me-bg)',
            fontFamily: 'var(--me-font-body)',
          }}
        >
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
            <div className='text-center mb-12'>
              <Shield
                className='w-16 h-16 mx-auto mb-4'
                style={{ color: 'var(--me-brand)' }}
              />
              <h1
                className='mb-4'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  fontSize: 'clamp(36px, 4.5vw, 48px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  color: 'var(--me-ink)',
                }}
              >
                Trust & Safety
              </h1>
              <p
                className='max-w-3xl mx-auto'
                style={{
                  fontSize: 20,
                  color: 'var(--me-ink-2)',
                  lineHeight: 1.55,
                }}
              >
                Your safety and security are our top priorities. Learn how we
                protect you on the platform.
              </p>
            </div>

            <div className='grid md:grid-cols-2 gap-8 mb-12'>
              <div style={cardStyle}>
                <CheckCircle
                  className='w-12 h-12 mb-4'
                  style={{ color: 'var(--me-brand)' }}
                />
                <h2 style={cardHeadingStyle}>Verified Contractors</h2>
                <p style={{ color: 'var(--me-ink-2)', marginBottom: 16 }}>
                  All contractors on our platform undergo a comprehensive
                  verification process including:
                </p>
                <ul className='space-y-2' style={{ color: 'var(--me-ink-2)' }}>
                  <li className='flex items-start'>
                    <span className='mr-2' style={{ color: 'var(--me-brand)' }}>
                      •
                    </span>
                    <span>Identity verification</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2' style={{ color: 'var(--me-brand)' }}>
                      •
                    </span>
                    <span>Background checks</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2' style={{ color: 'var(--me-brand)' }}>
                      •
                    </span>
                    <span>Insurance verification</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2' style={{ color: 'var(--me-brand)' }}>
                      •
                    </span>
                    <span>Skills assessment</span>
                  </li>
                </ul>
              </div>

              <div style={cardStyle}>
                <Shield
                  className='w-12 h-12 mb-4'
                  style={{ color: 'var(--me-brand)' }}
                />
                <h2 style={cardHeadingStyle}>Secure Payments</h2>
                <p style={{ color: 'var(--me-ink-2)', marginBottom: 16 }}>
                  We use industry-leading security measures to protect your
                  financial information:
                </p>
                <ul className='space-y-2' style={{ color: 'var(--me-ink-2)' }}>
                  <li className='flex items-start'>
                    <span className='mr-2' style={{ color: 'var(--me-brand)' }}>
                      •
                    </span>
                    <span>Encrypted payment processing</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2' style={{ color: 'var(--me-brand)' }}>
                      •
                    </span>
                    <span>Protected Payment on every job</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2' style={{ color: 'var(--me-brand)' }}>
                      •
                    </span>
                    <span>PCI DSS compliant</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2' style={{ color: 'var(--me-brand)' }}>
                      •
                    </span>
                    <span>Secure data storage</span>
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ ...cardStyle, marginBottom: 32 }}>
              <Users
                className='w-12 h-12 mb-4'
                style={{ color: 'var(--me-brand)' }}
              />
              <h2 style={cardHeadingStyle}>Community Guidelines</h2>
              <p style={{ color: 'var(--me-ink-2)', marginBottom: 24 }}>
                We maintain a safe and respectful community through clear
                guidelines and active moderation.
              </p>
              <div className='grid md:grid-cols-2 gap-6'>
                <div>
                  <h3
                    className='mb-2'
                    style={{
                      fontWeight: 600,
                      color: 'var(--me-ink)',
                    }}
                  >
                    For Homeowners
                  </h3>
                  <ul
                    className='space-y-2 text-sm'
                    style={{ color: 'var(--me-ink-2)' }}
                  >
                    <li>• Provide accurate job descriptions</li>
                    <li>• Communicate clearly and respectfully</li>
                    <li>• Pay contractors promptly</li>
                    <li>• Leave honest reviews</li>
                  </ul>
                </div>
                <div>
                  <h3
                    className='mb-2'
                    style={{
                      fontWeight: 600,
                      color: 'var(--me-ink)',
                    }}
                  >
                    For Contractors
                  </h3>
                  <ul
                    className='space-y-2 text-sm'
                    style={{ color: 'var(--me-ink-2)' }}
                  >
                    <li>• Complete work as agreed</li>
                    <li>• Maintain professional conduct</li>
                    <li>• Respond to messages promptly</li>
                    <li>• Follow all safety regulations</li>
                  </ul>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--me-warn-bg)',
                border: '1px solid var(--me-warn-fg)',
                borderRadius: 'var(--me-radius-card)',
                padding: 32,
              }}
            >
              <AlertTriangle
                className='w-12 h-12 mb-4'
                style={{ color: 'var(--me-warn-fg)' }}
              />
              <h2 style={cardHeadingStyle}>Report a Concern</h2>
              <p style={{ color: 'var(--me-ink-2)', marginBottom: 16 }}>
                If you encounter any safety issues or violations of our
                community guidelines, please report them immediately.
              </p>
              <Link
                href='/contact?subject=Safety+Concern'
                className='inline-block transition-colors'
                style={{
                  padding: '10px 24px',
                  background: 'var(--me-warn-fg)',
                  color: 'var(--me-on-brand)',
                  borderRadius: 'var(--me-radius-btn)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Report an Issue
              </Link>
            </div>
          </div>
        </div>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}
