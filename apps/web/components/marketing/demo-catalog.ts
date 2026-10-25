export type DemoAudience = 'homeowner' | 'contractor' | 'all';

export const PRODUCT_DEMOS = [
  {
    id: 'homeowner',
    file: '01-homeowner',
    audience: 'homeowner',
    label: 'For homeowners',
    title: 'Your home. One clear view.',
    duration: '26 seconds',
    description:
      'See how projects, property records and upcoming visits fit together.',
    steps: [
      'Start with your projects and upcoming work.',
      'Open a property to find its details and completed-job budgets.',
      'Check the calendar for your next visit.',
    ],
    links: [
      { label: 'Explore homeowner features', href: '/for-homeowners' },
      { label: 'How to compare proposals', href: '/blog/compare-bids' },
    ],
  },
  {
    id: 'local-work',
    file: '03-find-local-work',
    audience: 'contractor',
    label: 'For contractors',
    title: 'Find work in your area.',
    duration: '28 seconds',
    description:
      'Follow the journey from your service area to the job map and a proposal.',
    steps: [
      'Choose the area your business serves.',
      'Explore the map and review the job scope.',
      'Prepare a price and proposal for the homeowner.',
    ],
    links: [
      { label: 'Prepare your contractor profile', href: '/verification' },
      { label: 'Explore contractor features', href: '/for-contractors' },
    ],
  },
  {
    id: 'business',
    file: '02-contractor-business',
    audience: 'contractor',
    label: 'For contractors',
    title: 'Your trade. Your business.',
    duration: '24 seconds',
    description:
      'Take a look inside the Business hub, expense categories and document library.',
    steps: [
      'Find quotes, invoices and client tools in the Business hub.',
      'Track business costs and receipt records.',
      'Keep job paperwork in the document library.',
    ],
    links: [
      { label: 'Compare plans and fees', href: '/pricing' },
      { label: 'Read contractor guides', href: '/resources' },
    ],
  },
  {
    id: 'agreements',
    file: '04-clear-agreements',
    audience: 'all',
    label: 'For both sides of the job',
    title: 'Start with clear expectations.',
    duration: '25 seconds',
    description:
      'See the scope, price, dates and signature status together in a job agreement.',
    steps: [
      'Review what is included, the price and the planned dates.',
      'Check when both parties have signed.',
      'Find signed agreements in your document library.',
    ],
    links: [
      { label: 'Review completed work', href: '/blog/review-completed-work' },
      { label: 'Understand platform safeguards', href: '/safety' },
    ],
  },
] as const;

export type ProductDemo = (typeof PRODUCT_DEMOS)[number];

export function demosForAudience(audience: DemoAudience) {
  return PRODUCT_DEMOS.filter(
    (demo) =>
      audience === 'all' ||
      demo.audience === audience ||
      demo.audience === 'all'
  );
}
