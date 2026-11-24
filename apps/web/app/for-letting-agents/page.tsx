import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingNavigation } from '@/components/landing/landing-navigation';
import { Footer2025 } from '@/app/components/landing/Footer2025';
import {
  AGENCY_DEMO_PATH,
  MINTENANCE_PUBLIC_ORIGIN,
  publicShareCard,
} from '@/lib/marketing/public-journey';

const title = 'For letting agents | Mintenance';
const description =
  'Follow a repair from the tenant’s first report through assignment, completion and the property record.';
const url = `${MINTENANCE_PUBLIC_ORIGIN}/for-letting-agents`;
const shareImage = publicShareCard(
  'letting-agents',
  'Repair tracking for letting agents. The Mintenance property portfolio.'
);
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { type: 'website', title, description, url, images: [shareImage] },
  twitter: { card: 'summary_large_image', images: [shareImage] },
};

const repairJourney = [
  [
    'The tenant reports a repair',
    'Share a property reporting link. The tenant can describe the issue and add photos to their private case.',
  ],
  [
    'Your team assigns follow-up',
    'Review the report in the Action queue, assign an owner and agree the next step.',
  ],
  [
    'The contractor completes the work',
    'Create the job from the report. The contractor records progress and adds completion evidence.',
  ],
  [
    'The agency keeps the record',
    'Find the report, job and updates in the property history when the landlord asks what happened.',
  ],
];

export default function LettingAgentsPage() {
  return (
    <div data-theme='mint-editorial' className='me-root min-h-screen'>
      <LandingNavigation />
      <main id='main-content' className='mx-auto max-w-6xl px-6 py-16 sm:py-24'>
        <div className='max-w-3xl space-y-5'>
          <p className='t-meta'>For letting agents</p>
          <h1 className='t-h1'>Follow each repair from report to record.</h1>
          <p className='t-body text-lg'>
            Give tenants a place to report issues and give your team a clear
            view of who owns each repair.
          </p>
          <div className='flex flex-wrap items-center gap-4'>
            <Link href={AGENCY_DEMO_PATH} className='btn btn-primary'>
              Book a demo
            </Link>
            <Link href='/pricing#plans' className='btn btn-secondary'>
              See the Agency plan
            </Link>
          </div>
        </div>
        <ol className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {repairJourney.map(([heading, detail]) => (
            <li className='card space-y-3 p-6' key={heading}>
              <h2 className='t-h4'>{heading}</h2>
              <p className='t-body'>{detail}</p>
            </li>
          ))}
        </ol>
      </main>
      <Footer2025 />
    </div>
  );
}
