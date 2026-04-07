import Link from 'next/link';
import {
  Briefcase,
  CheckCircle,
  Shield,
  PoundSterling,
  TrendingUp,
  MapPin,
  Award,
  Sparkles,
  UserPlus,
  ArrowRight,
  BarChart3,
  Zap,
  Calendar,
  FileText,
  Users,
} from 'lucide-react';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Contractors - Grow Your Trade Business | Mintenance',
  description:
    'Join thousands of verified tradespeople across the UK. Get matched with homeowners, manage jobs, track finances, and get paid securely through Mintenance.',
  keywords:
    'contractor platform, tradesperson jobs, find work UK, verified contractor, secure payments, escrow, property maintenance jobs',
  openGraph: {
    title: 'For Contractors - Grow Your Trade Business | Mintenance',
    description:
      'Join thousands of verified tradespeople. Get matched with homeowners, manage jobs, and get paid securely.',
    type: 'website',
  },
};

const FEATURES = [
  {
    icon: MapPin,
    title: 'Find Jobs Near You',
    description: 'Browse a curated marketplace of local jobs filtered by trade, distance, and budget. See jobs on a map, bid with one tap, and get notified when new work drops in your area.',
    screenshot: '/screenshots/contractor/discover-jobs.png',
    screenshotAlt: 'Discover Jobs page showing map view with available jobs and filter chips',
    mobileScreenshot: '/screenshots/mobile/contractor-find-jobs.png',
    mobileAlt: 'Mobile map view showing nearby jobs with Quick Bid buttons',
    badge: 'Smart Matching',
  },
  {
    icon: BarChart3,
    title: 'Track Your Performance',
    description: 'See your win rate, total earnings, average rating, and bid trends over time. Understand which job categories bring the best return and where to focus your energy.',
    screenshot: '/screenshots/contractor/marketing.png',
    screenshotAlt: 'Marketing & Performance dashboard with activity trends and job categories',
    badge: 'Data-Driven',
  },
  {
    icon: Briefcase,
    title: 'Run Your Business',
    description: 'Everything in one place \u2014 finance dashboard, invoicing, quotes, client CRM, expense tracking, payouts, calendar, and time logging. No more spreadsheets.',
    screenshot: '/screenshots/contractor/dashboard.png',
    screenshotAlt: 'Contractor dashboard showing revenue overview, completion rate, and active jobs',
    mobileScreenshot: '/screenshots/mobile/contractor-business-hub.png',
    mobileAlt: 'Mobile Business Hub with Finance, Invoices, Quotes, Clients, Expenses, Payouts tiles',
    badge: 'All-in-One',
  },
  {
    icon: Zap,
    title: 'Job Marketplace',
    description: 'A curated feed of opportunities tailored to your expertise. Filter by trade, sort by pay or distance, and see AI-matched job scores. Save favourites and bid when ready.',
    mobileScreenshot: '/screenshots/mobile/contractor-marketplace.png',
    mobileAlt: 'Mobile Job Marketplace with local listings, average value, and filter tabs',
    screenshot: '/screenshots/contractor/discover-jobs.png',
    screenshotAlt: 'Discover Jobs page with job cards and map',
    badge: 'Curated Feed',
  },
  {
    icon: Shield,
    title: 'Get Paid Securely',
    description: 'Homeowner payment is held in escrow before you start. Complete the work, upload after photos \u2014 payment releases directly to your bank via Stripe Connect. No chasing invoices.',
    screenshot: '/screenshots/contractor/dashboard.png',
    screenshotAlt: 'Contractor dashboard showing earnings and pending payouts',
    mobileScreenshot: '/screenshots/mobile/contractor-dashboard.png',
    mobileAlt: 'Mobile contractor dashboard with Active Portfolio, earnings, and rating stats',
    badge: 'Escrow Protected',
  },
];

const STATS = [
  { value: 'Free', label: 'To join and start bidding' },
  { value: '100%', label: 'Escrow-protected payments' },
  { value: '0', label: 'Chasing invoices' },
  { value: '1 day', label: 'To set up your profile' },
];

const BUSINESS_TOOLS = [
  { icon: TrendingUp, title: 'Finance Dashboard', desc: 'Revenue tracking, profit margins, and cash flow insights' },
  { icon: FileText, title: 'Quotes & Invoices', desc: 'Build professional quotes and auto-generate invoices' },
  { icon: Users, title: 'Client CRM', desc: 'Manage customer relationships and repeat business' },
  { icon: Calendar, title: 'Calendar & Scheduling', desc: 'Plan your week, avoid double-bookings' },
  { icon: PoundSterling, title: 'Expense Tracking', desc: 'Log materials, fuel, and business costs' },
  { icon: Award, title: 'Verification & DBS', desc: 'Get verified and earn trust badges on your profile' },
];

const WHY_MINTENANCE = [
  {
    icon: Shield,
    title: 'Guaranteed Payment',
    description: 'Homeowner funds are held in escrow before you start work. Complete the job, upload photos \u2014 money goes straight to your bank. No invoicing, no chasing.',
  },
  {
    icon: Award,
    title: 'Build Your Reputation',
    description: 'Earn ratings, verification badges, and DBS-checked status. The more you build your profile, the more homeowners trust you with higher-value work.',
  },
  {
    icon: Sparkles,
    title: 'Replace 5 Apps With 1',
    description: 'Invoicing, expense tracking, quotes, client CRM, calendar, and time logging \u2014 all built in. Stop paying for tools that don\'t talk to each other.',
  },
];

export default function ForContractorsPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white">
        <LandingNavigation />

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-20 w-80 h-80 bg-emerald-500 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-teal-400 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium mb-6">
                  <Briefcase className="w-4 h-4" />
                  For Contractors
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Grow Your
                  <br />
                  <span className="text-emerald-400">Trade Business.</span>
                </h1>
                <p className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed">
                  Find local jobs, manage your business, and get paid securely. Mintenance gives you the tools, the clients, and the confidence to grow.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/register?role=contractor"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30"
                  >
                    Join as a Contractor
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all backdrop-blur-sm"
                  >
                    See How It Works
                  </Link>
                </div>
              </div>

              {/* Hero screenshots */}
              <div className="relative hidden lg:block">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                    src="/screenshots/contractor/dashboard.png"
                    alt="Mintenance contractor dashboard showing company stats, revenue overview, and active jobs"
                    width={800}
                    height={500}
                    className="w-full h-auto"
      
                  />
                </div>
                {/* Floating mobile */}
                <div className="absolute -bottom-8 -left-12 w-48 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 rotate-[-3deg]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                    src="/screenshots/mobile/contractor-dashboard.png"
                    alt="Mobile contractor dashboard with portfolio stats"
                    width={240}
                    height={520}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-gray-50 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature sections — alternating layout */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Win More Work
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                From finding jobs to getting paid, Mintenance handles the business side so you can focus on what you do best.
              </p>
            </div>

            <div className="space-y-24">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const isReversed = index % 2 === 1;

                return (
                  <div
                    key={feature.title}
                    className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center`}
                  >
                    <div className={`${isReversed ? 'lg:order-2' : ''}`}>
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
                        <Icon className="w-3.5 h-3.5" />
                        {feature.badge}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed text-lg">
                        {feature.description}
                      </p>
                    </div>

                    <div className={`relative ${isReversed ? 'lg:order-1' : ''}`}>
                      <div className="relative bg-gray-900 rounded-xl p-2 shadow-2xl">
                        <div className="flex items-center gap-1.5 px-3 py-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                          <div className="flex-1 mx-3 h-5 bg-gray-700 rounded-md" />
                        </div>
                        <div className="rounded-lg overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                            src={feature.screenshot}
                            alt={feature.screenshotAlt}
                            width={700}
                            height={440}
                            className="w-full h-auto"
                          />
                        </div>
                      </div>

                      {feature.mobileScreenshot && (
                        <div className="absolute -bottom-6 -right-6 w-36 rounded-2xl overflow-hidden shadow-xl border-4 border-white hidden md:block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                            src={feature.mobileScreenshot}
                            alt={feature.mobileAlt || ''}
                            width={180}
                            height={390}
                            className="w-full h-auto"
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

        {/* Business tools grid */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Your Business, All in One Place
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Stop juggling apps. Finance, invoicing, CRM, scheduling, expenses, and verification \u2014 all built in.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {BUSINESS_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{tool.title}</h3>
                    <p className="text-sm text-gray-500">{tool.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Why Contractors Choose Mintenance
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Real platform guarantees \u2014 not promises.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {WHY_MINTENANCE.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">{point.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{point.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Grow Your Business?
            </h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
              Join verified tradespeople across the UK. Set up your profile, start bidding, and get paid securely \u2014 all free to start.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/register?role=contractor"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 transition-all shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-700/50 hover:bg-emerald-700/70 text-white rounded-xl font-semibold transition-all backdrop-blur-sm"
              >
                View Plans
              </Link>
            </div>
          </div>
        </section>

        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}
