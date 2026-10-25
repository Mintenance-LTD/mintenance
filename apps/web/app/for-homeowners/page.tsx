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
    'Explore the homeowner demo. Organise properties and visits, post maintenance jobs and compare contractor proposals with Mintenance.',
  keywords:
    'homeowner maintenance, property repair, find contractor UK, protected payment, AI building assessment, local tradespeople',
  openGraph: {
    title: 'For Homeowners - Your Property, Protected | Mintenance',
    description:
      'See how property records, maintenance jobs and upcoming visits fit together in Mintenance.',
    type: 'website',
  },
};

const FEATURES: MarketingFeature[] = [
  {
    icon: Search,
    title: 'Describe the Work You Need',
    description:
      'Describe what needs fixing, choose your property and add photos, a budget and preferred timing so interested contractors can prepare a proposal.',
    screenshot: '/media/landing/homeowner-post-job.webp',
    screenshotWidth: 880,
    screenshotHeight: 810,
    screenshotAlt:
      'Current web job form with a fictional kitchen tap repair description',
    mobileScreenshot: '/media/landing/mobile-homeowner-post.webp',
    mobileAlt:
      'Current mobile job form with repair categories, description and urgency',
    badge: 'Quick & Easy',
  },
  {
    icon: Sparkles,
    title: 'Get Photo Guidance From Mint AI',
    description:
      'Upload a photo to help describe a maintenance issue and explore an initial repair estimate. This is guidance; confirm the scope and price with a qualified tradesperson.',
    screenshot: '/media/landing/mint-ai-upload.webp',
    screenshotWidth: 1216,
    screenshotHeight: 560,
    screenshotAlt:
      'Current Mint AI photo-upload form for property damage guidance',
    badge: 'Powered by Mint AI',
  },
  {
    icon: CheckCircle,
    title: 'Compare & Choose',
    description:
      "Review bids from local contractors. See their ratings, completed jobs, company details, and portfolio. Accept the best offer \u2014 your money stays protected in escrow until you're happy.",
    screenshot: '/media/landing/homeowner-job-detail.webp',
    screenshotAlt:
      'Current web job record showing an accepted demo proposal and agreed scope',
    mobileScreenshot: '/media/landing/mobile-homeowner-review.webp',
    mobileAlt:
      'Mobile bid review with a fictional contractor, price and estimated duration',
    badge: 'You Decide',
  },
  {
    icon: Eye,
    title: 'Track Every Step',
    description:
      'Follow the entire job lifecycle from posting to completion. See real-time progress, before and after photos, and approve work before releasing payment.',
    screenshot: '/media/landing/homeowner-jobs.webp',
    screenshotAlt:
      'Current homeowner job list with status badges and fictional property details',
    badge: 'Full Visibility',
  },
  {
    icon: Shield,
    title: 'Payment Protection',
    description:
      'Your money is held securely with Protected Payment. Contractors upload before photos, complete the work, then submit after photos. You compare and approve before a single penny is released.',
    screenshot: '/media/landing/homeowner-payments.webp',
    screenshotAlt:
      'Current payments screen with demo paid, protected and refunded amounts',
    mobileScreenshot: '/media/landing/mobile-agreement.webp',
    mobileAlt: 'Mobile signed demo agreement and next step to fund escrow',
    badge: 'Protected Payment',
  },
];

const TRUST_POINTS: MarketingTrustPoint[] = [
  {
    icon: Shield,
    title: 'Protected Payment',
    description:
      'Review the funding, completion and payment-release stages before agreeing a job. Read the platform safeguards and terms for the applicable conditions.',
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
    desc: 'Add photos and describe the issue. Mint AI guidance is optional.',
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
                <div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 text-[#2f6f5f] mb-4'>
                  <Icon className='w-6 h-6' />
                </div>
                <div className='text-xs font-bold text-[#2f6f5f] uppercase tracking-wider mb-2'>
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
      audience='homeowner'
      accent='teal'
      hero={{
        badge: { icon: Home, label: 'For Homeowners' },
        title: 'Your Property.',
        highlightedWord: 'Protected.',
        description:
          'Post a maintenance job, get AI-assisted damage assessments, compare bids from local contractors, and pay securely with Protected Payment. You stay in control from first quote to final sign-off.',
        primaryCTA: {
          label: 'Get Started Free',
          href: '/register?role=homeowner',
        },
        secondaryCTA: {
          label: 'Watch the Homeowner Demo',
          href: '#demo-homeowner',
        },
        desktopScreenshot: {
          src: '/media/landing/homeowner-properties.webp',
          alt: 'Current homeowner property overview with fictional demo properties',
        },
        mobileScreenshot: {
          src: '/media/landing/mobile-homeowner-home.webp',
          alt: 'Mobile app showing homeowner dashboard',
        },
      }}
      stats={[
        { value: 'Describe', label: 'The work you need' },
        { value: 'Compare', label: 'Contractor proposals' },
        { value: 'Organise', label: 'Properties and visits' },
        { value: 'Review', label: 'The finished work' },
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
          'Create your homeowner account, add your property and describe the work you need.',
        primary: { label: 'Post a Job Now', href: '/register?role=homeowner' },
        secondary: { label: 'View Pricing', href: '/pricing' },
      }}
    />
  );
}
