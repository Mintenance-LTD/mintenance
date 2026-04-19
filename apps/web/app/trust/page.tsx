/**
 * /trust — public platform-trust page.
 *
 * Turns the Mintenance security posture ("324 public tables, 99.7% RLS")
 * into a marketing asset, per docs/RETENTION_ROADMAP_2026.md R1 and
 * the source PDF §5.3 custody trust dimension.
 *
 * Server component with hourly ISR via TrustStats.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Eye,
  Database,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react';
import { LandingNavigation } from '@/app/components/landing/LandingNavigation';
import { Footer2025 } from '@/app/components/landing/Footer2025';
import { TrustStats } from '@/components/trust/TrustStats';

export const metadata: Metadata = {
  title: 'Trust & Security | Mintenance',
  description:
    'How Mintenance protects your data and your money. Live platform stats, Row-Level Security coverage, audit cadence and the SOC2 roadmap.',
};

// Trigger hourly re-render so /api/stats/trust numbers stay fresh.
export const revalidate = 3600;

const PILLARS = [
  {
    icon: Lock,
    title: 'Protected Payment',
    body: 'Every homeowner deposit is held in Stripe before the contractor arrives and released only after you approve the work (or automatically after the 7-day review window). The money never sits on a Mintenance balance sheet.',
  },
  {
    icon: Database,
    title: 'Data custody',
    body: 'Database access is locked down by Row-Level Security on every table that holds user data. The only exception is PostGIS system metadata (world-wide map reference constants). Numbers update live from the database.',
  },
  {
    icon: Eye,
    title: 'Photo evidence',
    body: 'Contractors upload before-photos on arrival with a 100m geofence check, and after-photos on completion. You compare them side-by-side before releasing payment.',
  },
  {
    icon: ClipboardCheck,
    title: 'Audit discipline',
    body: 'Every platform change ships through a code-review gate plus an audit trail. Two full security audits landed in the last 30 days; the latest runbooks are published in the engineering repo.',
  },
];

const ROADMAP = [
  {
    title: 'Leaked-password protection',
    status: 'Planned — Supabase Auth toggle',
    note: 'Blocks sign-ups that reuse a password leaked in a public breach. Tracked in the dashboard checklist.',
  },
  {
    title: 'Postgres security patches',
    status: 'Planned — low-traffic window upgrade',
    note: 'We run the latest Postgres 17 line and patch on the Supabase cadence.',
  },
  {
    title: 'SOC 2 Type I',
    status: 'On roadmap',
    note: 'Dependent on scale milestones. The control framework is being built up in advance — see audit logs, RBAC, and incident runbooks already in production.',
  },
];

export default function TrustPage() {
  return (
    <div className='min-h-screen bg-white'>
      <LandingNavigation />

      {/* Hero */}
      <section className='pt-20 pb-12 bg-gradient-to-b from-white to-gray-50'>
        <div className='max-w-4xl mx-auto px-6'>
          <div className='inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5'>
            <Shield className='w-3.5 h-3.5' />
            Trust &amp; Security
          </div>
          <h1 className='text-4xl sm:text-5xl font-bold text-gray-900 mb-5'>
            Built to keep your money and your data where they belong.
          </h1>
          <p className='text-lg text-gray-600 max-w-2xl'>
            This page is a live view of how Mintenance handles the two things
            that matter most on a marketplace: the money moving between
            homeowners and contractors, and the personal data underneath it.
          </p>
        </div>
      </section>

      {/* Live stats */}
      <TrustStats />

      {/* Four pillars */}
      <section className='py-16 bg-gray-50 border-t border-gray-200'>
        <div className='max-w-5xl mx-auto px-6'>
          <h2 className='text-3xl font-bold text-gray-900 mb-10'>
            Four things we do, always
          </h2>
          <div className='grid md:grid-cols-2 gap-5'>
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className='rounded-2xl border border-gray-200 bg-white p-6'
                >
                  <div className='inline-flex items-center justify-center w-11 h-11 rounded-xl bg-teal-100 text-teal-600 mb-3'>
                    <Icon className='w-5 h-5' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-1'>
                    {p.title}
                  </h3>
                  <p className='text-sm text-gray-600 leading-relaxed'>
                    {p.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roadmap + public limits */}
      <section className='py-16 bg-white border-t border-gray-200'>
        <div className='max-w-5xl mx-auto px-6'>
          <h2 className='text-3xl font-bold text-gray-900 mb-3'>
            On the roadmap
          </h2>
          <p className='text-gray-600 max-w-2xl mb-8'>
            What we haven&rsquo;t done yet — stated out loud. Security works
            best when it&rsquo;s public.
          </p>
          <div className='space-y-3'>
            {ROADMAP.map((r) => (
              <div
                key={r.title}
                className='rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'
              >
                <div>
                  <div className='font-semibold text-gray-900'>{r.title}</div>
                  <p className='text-sm text-gray-600 mt-1'>{r.note}</p>
                </div>
                <span className='text-xs font-bold uppercase tracking-widest text-teal-600 whitespace-nowrap'>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className='py-16 bg-gray-900'>
        <div className='max-w-4xl mx-auto px-6 text-center'>
          <h2 className='text-3xl font-bold text-white mb-3'>
            Questions about how we handle your data?
          </h2>
          <p className='text-gray-300 mb-6'>
            Drop us a note at{' '}
            <a
              href='mailto:security@mintenance.co.uk'
              className='text-teal-300 underline'
            >
              security@mintenance.co.uk
            </a>{' '}
            or review our full privacy policy.
          </p>
          <Link
            href='/privacy'
            className='inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors'
          >
            Read our privacy policy
            <ArrowRight className='w-4 h-4' />
          </Link>
        </div>
      </section>

      <Footer2025 />
    </div>
  );
}
