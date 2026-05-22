import type { Metadata } from 'next';
import {
  Briefcase,
  Shield,
  PoundSterling,
  TrendingUp,
  MapPin,
  Award,
  Sparkles,
  BarChart3,
  Zap,
  Calendar,
  FileText,
  Users,
} from 'lucide-react';
import {
  MarketingFeaturePage,
  type MarketingFeature,
  type MarketingTrustPoint,
} from '@/components/marketing/MarketingFeaturePage';
import { NoLeadFeesSection } from '@/components/marketing/NoLeadFeesSection';
import { CompetitorComparisonTable } from '@/components/marketing/CompetitorComparisonTable';

export const metadata: Metadata = {
  title: 'For Contractors - Grow Your Trade Business | Mintenance',
  description:
    'Join the Mintenance tradesperson network. Get matched with homeowners, manage jobs, track finances, and get paid securely through escrow.',
  keywords:
    'contractor platform, tradesperson jobs, find work UK, secure payments, escrow, property maintenance jobs',
  openGraph: {
    title: 'For Contractors - Grow Your Trade Business | Mintenance',
    description:
      'Join the Mintenance tradesperson network. Get matched with homeowners, manage jobs, and get paid securely through escrow.',
    type: 'website',
  },
};

const FEATURES: MarketingFeature[] = [
  {
    icon: MapPin,
    title: 'Find Jobs Near You',
    description:
      'Browse a curated marketplace of local jobs filtered by trade, distance, and budget. See jobs on a map, bid with one tap, and get notified when new work drops in your area.',
    screenshot: '/screenshots/contractor/discover-jobs.png',
    screenshotAlt:
      'Discover Jobs page showing map view with available jobs and filter chips',
    mobileScreenshot: '/screenshots/mobile/contractor-find-jobs.png',
    mobileAlt: 'Mobile map view showing nearby jobs with Quick Bid buttons',
    badge: 'Smart Matching',
  },
  {
    icon: BarChart3,
    title: 'Track Your Performance',
    description:
      'See your win rate, total earnings, average rating, and bid trends over time. Understand which job categories bring the best return and where to focus your energy.',
    screenshot: '/screenshots/contractor/marketing.png',
    screenshotAlt:
      'Marketing & Performance dashboard with activity trends and job categories',
    badge: 'Data-Driven',
  },
  {
    icon: Briefcase,
    title: 'Run Your Business',
    description:
      'Everything in one place \u2014 finance dashboard, invoicing, quotes, client CRM, expense tracking, payouts, calendar, and time logging. No more spreadsheets.',
    screenshot: '/screenshots/contractor/dashboard.png',
    screenshotAlt:
      'Contractor dashboard showing revenue overview, completion rate, and active jobs',
    mobileScreenshot: '/screenshots/mobile/contractor-business-hub.png',
    mobileAlt:
      'Mobile Business Hub with Finance, Invoices, Quotes, Clients, Expenses, Payouts tiles',
    badge: 'All-in-One',
  },
  {
    icon: Zap,
    title: 'Job Marketplace',
    description:
      'A curated feed of opportunities tailored to your expertise. Filter by trade, sort by pay or distance, and see AI-matched job scores. Save favourites and bid when ready.',
    mobileScreenshot: '/screenshots/mobile/contractor-marketplace.png',
    mobileAlt:
      'Mobile Job Marketplace with local listings, average value, and filter tabs',
    screenshot: '/screenshots/contractor/discover-jobs.png',
    screenshotAlt: 'Discover Jobs page with job cards and map',
    badge: 'Curated Feed',
  },
  {
    icon: Shield,
    title: 'Get Paid Securely',
    description:
      'Homeowner payment is held in escrow before you start. Complete the work, upload after photos \u2014 payment releases directly to your bank via Stripe Connect. No chasing invoices.',
    screenshot: '/screenshots/contractor/dashboard.png',
    screenshotAlt: 'Contractor dashboard showing earnings and pending payouts',
    mobileScreenshot: '/screenshots/mobile/contractor-dashboard.png',
    mobileAlt:
      'Mobile contractor dashboard with Active Portfolio, earnings, and rating stats',
    badge: 'Escrow Protected',
  },
];

const BUSINESS_TOOLS = [
  {
    icon: TrendingUp,
    title: 'Finance Dashboard',
    desc: 'Revenue tracking, profit margins, and cash flow insights',
  },
  {
    icon: FileText,
    title: 'Quotes & Invoices',
    desc: 'Build professional quotes and auto-generate invoices',
  },
  {
    icon: Users,
    title: 'Client CRM',
    desc: 'Manage customer relationships and repeat business',
  },
  {
    icon: Calendar,
    title: 'Calendar & Scheduling',
    desc: 'Plan your week, avoid double-bookings',
  },
  {
    icon: PoundSterling,
    title: 'Expense Tracking',
    desc: 'Log materials, fuel, and business costs',
  },
  {
    icon: Award,
    title: 'Credentials & optional DBS',
    desc: 'Add your licences and insurance. Initiate an optional DBS check from your profile to show homeowners extra reassurance.',
  },
];

const WHY_MINTENANCE: MarketingTrustPoint[] = [
  {
    icon: Shield,
    title: 'Escrow-protected payment',
    description:
      'Homeowner funds are held in escrow before you start work. Complete the job, upload photos, and on homeowner approval the money goes straight to your Stripe Connect payout account. No invoicing, no chasing.',
  },
  {
    icon: Award,
    title: 'Build Your Reputation',
    description:
      'Collect homeowner ratings on completed jobs, list your licences and insurance, and add an optional DBS check to strengthen your profile. The more you build, the more homeowners can confidently hire you for higher-value work.',
  },
  {
    icon: Sparkles,
    title: 'Replace 5 Apps With 1',
    description:
      "Invoicing, expense tracking, quotes, client CRM, calendar, and time logging \u2014 all built in. Stop paying for tools that don't talk to each other.",
  },
];

function BusinessToolsGrid() {
  return (
    <section
      data-theme='mint-editorial'
      className='py-20'
      style={{
        background: 'var(--me-bg-2)',
        fontFamily: 'var(--me-font-body)',
      }}
    >
      <div className='max-w-5xl mx-auto px-6'>
        <div className='text-center mb-12'>
          <h2
            className='mb-4'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              fontSize: 'clamp(28px, 3.5vw, 36px)',
              letterSpacing: '-0.02em',
              color: 'var(--me-ink)',
            }}
          >
            Your Business, All in One Place
          </h2>
          <p className='max-w-xl mx-auto' style={{ color: 'var(--me-ink-2)' }}>
            Stop juggling apps. Finance, invoicing, CRM, scheduling, expenses,
            and credentials &mdash; all built in.
          </p>
        </div>
        <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {BUSINESS_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.title}
                className='p-6 transition-shadow'
                style={{
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card)',
                  border: '1px solid var(--me-line)',
                  boxShadow: 'var(--me-shadow-card)',
                }}
              >
                <div
                  className='inline-flex items-center justify-center w-10 h-10 mb-3'
                  style={{
                    borderRadius: 'var(--me-radius-input)',
                    background: 'var(--me-brand-soft)',
                    color: 'var(--me-brand)',
                  }}
                >
                  <Icon className='w-5 h-5' />
                </div>
                <h3
                  className='font-semibold mb-1'
                  style={{ color: 'var(--me-ink)' }}
                >
                  {tool.title}
                </h3>
                <p className='text-sm' style={{ color: 'var(--me-ink-3)' }}>
                  {tool.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function ForContractorsPage() {
  return (
    <MarketingFeaturePage
      accent='emerald'
      hero={{
        badge: { icon: Briefcase, label: 'For Contractors' },
        title: 'Grow Your',
        highlightedWord: 'Trade Business.',
        description:
          'Find local jobs, manage your business, and get paid securely. Mintenance gives you the tools, the clients, and the confidence to grow.',
        primaryCTA: {
          label: 'Join as a Contractor',
          href: '/register?role=contractor',
        },
        secondaryCTA: { label: 'See How It Works', href: '/how-it-works' },
        desktopScreenshot: {
          src: '/screenshots/contractor/dashboard.png',
          alt: 'Mintenance contractor dashboard showing company stats, revenue overview, and active jobs',
        },
        mobileScreenshot: {
          src: '/screenshots/mobile/contractor-dashboard.png',
          alt: 'Mobile contractor dashboard with portfolio stats',
        },
      }}
      stats={[
        { value: 'Free', label: 'To join and start bidding' },
        { value: '100%', label: 'Escrow-protected payments' },
        { value: '0', label: 'Chasing invoices' },
        { value: '1 day', label: 'To set up your profile' },
      ]}
      featuresHeading={{
        title: 'Everything You Need to Win More Work',
        description:
          'From finding jobs to getting paid, Mintenance handles the business side so you can focus on what you do best.',
      }}
      features={FEATURES}
      extraSection={
        <>
          <NoLeadFeesSection />
          <CompetitorComparisonTable />
          <BusinessToolsGrid />
        </>
      }
      trust={{
        title: 'Why Contractors Choose Mintenance',
        description:
          'Real platform safeguards \u2014 escrow, photo proof, dispute support.',
        points: WHY_MINTENANCE,
      }}
      finalCTA={{
        title: 'Ready to Grow Your Business?',
        description:
          'Join the Mintenance tradesperson network. Set up your profile, start bidding, and get paid securely through escrow \u2014 all free to start.',
        primary: {
          label: 'Get Started Free',
          href: '/register?role=contractor',
        },
        secondary: { label: 'View Plans', href: '/pricing' },
      }}
    />
  );
}
