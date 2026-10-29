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
      'Set your service area, explore the job map and review the scope before preparing a proposal. Available jobs depend on your area and trade.',
    screenshot: '/media/landing/contractor-discover.webp',
    screenshotAlt: 'Current web Discover page with distance and budget filters',
    mobileScreenshot: '/media/landing/mobile-contractor-map.webp',
    mobileAlt:
      'Current mobile job map with fictional locations and a demo Quick Bid card',
    badge: 'Smart Matching',
  },
  {
    icon: BarChart3,
    title: 'Track Your Finances',
    description:
      'Review revenue, pending payouts and average job value in one place. Follow the monthly trend and keep business costs and payment records close.',
    screenshot: '/media/landing/contractor-finance.webp',
    screenshotAlt:
      'Current contractor finance overview with fictional revenue and payout figures',
    badge: 'Data-Driven',
  },
  {
    icon: Briefcase,
    title: 'Run Your Business',
    description:
      'Everything in one place \u2014 finance dashboard, invoicing, quotes, client CRM, expense tracking, payouts, calendar, and time logging. No more spreadsheets.',
    screenshot: '/media/landing/contractor-quotes.webp',
    screenshotAlt:
      'Current contractor quotes workspace with fictional amounts and customer records',
    mobileScreenshot: '/media/landing/mobile-contractor-business.webp',
    mobileScreenshotHeight: 1150,
    mobileAlt:
      'Mobile Business Hub with Finance, Invoices, Quotes, Clients, Expenses, Payouts tiles',
    badge: 'All-in-One',
  },
  {
    icon: Zap,
    title: 'Keep Your Jobs Organised',
    description:
      'Move between bids, contracts and active jobs. Open the job record to review the scope, check its status and keep track of the next step.',
    mobileScreenshot: '/media/landing/mobile-contractor-jobs.webp',
    mobileAlt:
      'Current mobile job workspace with bids, contracts and active-job tabs',
    screenshot: '/media/landing/contractor-jobs.webp',
    screenshotAlt:
      'Current contractor job list with fictional customers and status badges',
    badge: 'Your Workflow',
  },
  {
    icon: Shield,
    title: 'Get Paid Securely',
    description:
      'Follow the funding and completion stages in the job record. Submit completion evidence for review and check the payment and payout status in your account.',
    screenshot: '/media/landing/contractor-finance.webp',
    screenshotAlt:
      'Current finance overview showing demo revenue and pending payouts',
    mobileScreenshot: '/media/landing/mobile-contractor-home.webp',
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
      'Check the funding status before starting work and submit completion evidence for homeowner review. Read the payment terms for release conditions and payout timing.',
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
            and credentials in one place.
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
      audience='contractor'
      accent='emerald'
      hero={{
        badge: { icon: Briefcase, label: 'For Contractors' },
        title: 'Grow Your',
        highlightedWord: 'Trade Business.',
        description:
          'Explore local jobs, prepare proposals and keep business admin together. See the map, expenses and document tools before you join.',
        primaryCTA: {
          label: 'Join as a Contractor',
          href: '/register?role=contractor',
        },
        secondaryCTA: {
          label: 'Watch the Job Map Demo',
          href: '#demo-local-work',
        },
        desktopScreenshot: {
          src: '/media/landing/contractor-quotes.webp',
          alt: 'Current contractor quotes workspace with fictional customer and pricing details',
        },
        mobileScreenshot: {
          src: '/media/landing/mobile-contractor-home.webp',
          alt: 'Mobile contractor dashboard with portfolio stats',
        },
      }}
      stats={[
        { value: 'Explore', label: 'Work in your service area' },
        { value: 'Propose', label: 'Your price and scope' },
        { value: 'Manage', label: 'Business costs and records' },
        { value: 'Build', label: 'Your contractor profile' },
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
