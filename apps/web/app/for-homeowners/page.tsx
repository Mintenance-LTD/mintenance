import type { Metadata } from 'next';
import {
  Camera,
  Shield,
  PoundSterling,
  Search,
  CheckCircle,
  Sparkles,
  Home,
  Eye,
} from 'lucide-react';
import {
  MarketingFeaturePage,
  type MarketingFeature,
  type MarketingTrustPoint,
} from '@/components/marketing/MarketingFeaturePage';

export const metadata: Metadata = {
  title: 'For Homeowners - Your Property, Protected | Mintenance',
  description:
    'Post a job in 60 seconds. Get AI-assisted damage assessments, compare bids from local contractors, and pay securely with Protected Payment. Your money is held in escrow until you approve the work.',
  keywords:
    'homeowner maintenance, property repair, find contractor UK, protected payment, AI building assessment, local tradespeople',
  openGraph: {
    title: 'For Homeowners - Your Property, Protected | Mintenance',
    description:
      'AI damage assessments, local contractors, Protected Payment. Post a job in 60 seconds.',
    type: 'website',
  },
};

const FEATURES: MarketingFeature[] = [
  {
    icon: Search,
    title: 'Post a Job in Seconds',
    description:
      'Describe what needs fixing, pick your property, set your budget. Local contractors in your area get notified instantly.',
    screenshot: '/screenshots/homeowner/dashboard.png',
    screenshotAlt: 'Homeowner dashboard with job posting search bar',
    mobileScreenshot: '/screenshots/mobile/homeowner-dashboard.png',
    mobileAlt: 'Mobile homeowner dashboard showing active projects and bids',
    badge: 'Quick & Easy',
  },
  {
    icon: Sparkles,
    title: "AI Tells You What's Wrong",
    description:
      'Upload a photo of the damage. Our AI analyses it in seconds \u2014 identifying the problem, estimating repair costs, listing materials needed, and assessing insurance impact.',
    screenshot: '/screenshots/homeowner/ai-assessment.png',
    screenshotAlt:
      'AI Building Assessment showing damage analysis with cost estimate',
    badge: 'Powered by Mint AI',
  },
  {
    icon: CheckCircle,
    title: 'Compare & Choose',
    description:
      "Review bids from local contractors. See their ratings, completed jobs, company details, and portfolio. Accept the best offer \u2014 your money stays protected in escrow until you're happy.",
    screenshot: '/screenshots/homeowner/bids-received.png',
    screenshotAlt:
      'Job detail page showing bids received with contractor profiles',
    mobileScreenshot: '/screenshots/mobile/homeowner-bids.png',
    mobileAlt: 'Mobile view of bids received section',
    badge: 'You Decide',
  },
  {
    icon: Eye,
    title: 'Track Every Step',
    description:
      'Follow the entire job lifecycle from posting to completion. See real-time progress, before and after photos, and approve work before releasing payment.',
    screenshot: '/screenshots/homeowner/job-progress.png',
    screenshotAlt:
      'Job progress timeline showing all steps from posting to payment',
    badge: 'Full Visibility',
  },
  {
    icon: Shield,
    title: 'Payment Protection',
    description:
      'Your money is held securely with Protected Payment. Contractors upload before photos, complete the work, then submit after photos. You compare and approve before a single penny is released.',
    screenshot: '/screenshots/homeowner/property-management.png',
    screenshotAlt: 'Property management view with Protected Payment',
    mobileScreenshot: '/screenshots/mobile/homeowner-properties.png',
    mobileAlt: 'Mobile property management screen',
    badge: 'Protected Payment',
  },
];

const TRUST_POINTS: MarketingTrustPoint[] = [
  {
    icon: Shield,
    title: 'Protected Payment',
    description:
      'Your money is held securely by Stripe until you confirm the work is done. No risk of paying upfront and getting ghosted.',
  },
  {
    icon: Camera,
    title: 'Photo Evidence Required',
    description:
      'Contractors must upload before and after photos. You compare them side by side and approve before payment releases.',
  },
  {
    icon: CheckCircle,
    title: 'Reviewed Before They Bid',
    description:
      'Contractors share their business details, declared licences and insurance during onboarding. Our admin team reviews each submission manually before they can bid on jobs, and an optional DBS check is available on each profile.',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '1',
    icon: Camera,
    title: 'Upload a Photo',
    desc: 'Snap a picture of the damage. AI analyses it instantly.',
  },
  {
    step: '2',
    icon: Search,
    title: 'Get Matched',
    desc: 'Local contractors in your area bid on your job.',
  },
  {
    step: '3',
    icon: PoundSterling,
    title: 'Pay Securely',
    desc: 'Money held with Protected Payment until you approve the work.',
  },
  {
    step: '4',
    icon: CheckCircle,
    title: 'Approve & Done',
    desc: 'Compare before/after photos. Release payment when happy.',
  },
];

function HowItWorksSection() {
  return (
    <section className='py-20 bg-gray-50'>
      <div className='max-w-5xl mx-auto px-6'>
        <h2 className='text-3xl font-bold text-gray-900 text-center mb-16'>
          How It Works
        </h2>
        <div className='grid md:grid-cols-4 gap-8'>
          {HOW_IT_WORKS_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className='text-center'>
                <div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 mb-4'>
                  <Icon className='w-6 h-6' />
                </div>
                <div className='text-xs font-bold text-teal-600 uppercase tracking-wider mb-2'>
                  Step {item.step}
                </div>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  {item.title}
                </h3>
                <p className='text-sm text-gray-500'>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function ForHomeownersPage() {
  return (
    <MarketingFeaturePage
      accent='teal'
      hero={{
        badge: { icon: Home, label: 'For Homeowners' },
        title: 'Your Property.',
        highlightedWord: 'Protected.',
        description:
          'Post a maintenance job, get AI-assisted damage assessments, compare bids from local contractors, and pay securely with Protected Payment. You stay in control from first quote to final sign-off.',
        primaryCTA: { label: 'Get Started Free', href: '/register' },
        secondaryCTA: { label: 'How It Works', href: '/how-it-works' },
        desktopScreenshot: {
          src: '/screenshots/homeowner/dashboard.png',
          alt: 'Mintenance homeowner dashboard showing active jobs, bids received, and project overview',
        },
        mobileScreenshot: {
          src: '/screenshots/mobile/homeowner-dashboard.png',
          alt: 'Mobile app showing homeowner dashboard',
        },
      }}
      stats={[
        { value: '60s', label: 'To post a job' },
        { value: '100%', label: 'Protected Payment on every job' },
        { value: '24/7', label: 'AI damage assessment' },
        { value: 'Free', label: 'To get started' },
      ]}
      featuresHeading={{
        title: 'Everything You Need to Maintain Your Property',
        description:
          'From AI damage detection to Protected Payment, Mintenance handles the entire maintenance lifecycle.',
      }}
      features={FEATURES}
      extraSection={<HowItWorksSection />}
      trust={{
        title: 'Built on Trust',
        description:
          'Every part of Mintenance is designed to protect your money and your property.',
        points: TRUST_POINTS,
      }}
      finalCTA={{
        title: 'Ready to Get Your Home Sorted?',
        description:
          'Join thousands of UK homeowners who protect their property with Mintenance. Post your first job for free.',
        primary: { label: 'Post a Job Now', href: '/register' },
        secondary: { label: 'View Pricing', href: '/pricing' },
      }}
    />
  );
}
