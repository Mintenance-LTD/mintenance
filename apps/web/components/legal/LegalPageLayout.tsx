import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LandingNavigation } from '@/app/components/landing/LandingNavigation';
import { Footer2025 } from '@/app/components/landing/Footer2025';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div
      data-theme='mint-editorial'
      className='min-h-screen flex flex-col'
      style={{
        background: 'var(--me-bg)',
        fontFamily: 'var(--me-font-body)',
        color: 'var(--me-ink)',
      }}
    >
      <LandingNavigation />
      <main className='flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div
          className='p-6 md:p-12'
          style={{
            background: 'var(--me-surface)',
            borderRadius: 'var(--me-radius-card)',
            border: '1px solid var(--me-line)',
            boxShadow: 'var(--me-shadow-card)',
          }}
        >
          <h1
            className='text-4xl mb-2'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--me-ink)',
            }}
          >
            {title}
          </h1>
          <p className='mb-8' style={{ color: 'var(--me-ink-3)' }}>
            Last updated: {lastUpdated}
          </p>
          <div className='prose prose-lg max-w-none'>{children}</div>
        </div>

        <div
          className='mt-12 pt-8'
          style={{ borderTop: '1px solid var(--me-line)' }}
        >
          <Link
            href='/'
            className='inline-flex items-center font-medium transition-colors rounded'
            style={{ color: 'var(--me-brand)' }}
          >
            <ArrowLeft className='w-5 h-5 mr-2' aria-hidden='true' />
            Back to Home
          </Link>
        </div>
      </main>
      <Footer2025 />
    </div>
  );
}
