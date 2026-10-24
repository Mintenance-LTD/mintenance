/** Educational personas never grant permissions; every destination enforces access. */
export type OnboardingPersona =
  | 'homeowner'
  | 'landlord'
  | 'agency'
  | 'tenant'
  | 'contractor'
  | 'team-member'
  | 'admin';
export const ONBOARDING_VERSION = 2;
export const PERSONA_LABELS: Record<OnboardingPersona, string> = {
  homeowner: 'Homeowner',
  landlord: 'Landlord / property manager',
  agency: 'Agency',
  tenant: 'Tenant / property contact',
  contractor: 'Contractor business owner',
  'team-member': 'Contractor team member',
  admin: 'Platform administrator',
};
export function onboardingPersonas(role: string): OnboardingPersona[] {
  if (role === 'admin') return ['admin'];
  if (role === 'contractor') return ['contractor', 'team-member'];
  return role === 'homeowner'
    ? ['homeowner', 'landlord', 'agency', 'tenant']
    : [];
}
export interface FeatureGuide {
  id: string;
  title: string;
  personas: OnboardingPersona[];
  href: string;
  steps: string[];
  mobileScreen?: string;
}
const owners: OnboardingPersona[] = ['homeowner', 'landlord', 'agency'];
const trades: OnboardingPersona[] = ['contractor', 'team-member'];
const all: OnboardingPersona[] = [...owners, ...trades, 'tenant', 'admin'];
function g(
  id: string,
  title: string,
  personas: OnboardingPersona[],
  href: string,
  steps: string[],
  mobileScreen?: string
): FeatureGuide {
  return { id, title, personas, href, steps, mobileScreen };
}
export const FEATURE_GUIDES: FeatureGuide[] = [
  g(
    'account',
    'Account security and recovery',
    all,
    '/settings/security/mfa',
    [
      'Verify your email and check your contact details.',
      'Set up two-factor authentication and store recovery codes safely.',
      'Review security settings before changing access.',
    ],
    'MFASecurity'
  ),
  g(
    'profile',
    'Your profile and preferences',
    owners,
    '/profile',
    [
      'Add your name, contact number and photo.',
      'Check your home preferences and location.',
      'You can change these details later from Profile.',
    ],
    'EditProfile'
  ),
  g(
    'properties',
    'Properties, rooms and history',
    owners,
    '/properties',
    [
      'Add the address and check its location.',
      'Add rooms and relevant property details.',
      'Open the property to see jobs, documents and assessment history.',
    ],
    'Properties'
  ),
  g(
    'assessment',
    'Mint AI and photo assessments',
    owners,
    '/dashboard/maintenance-ai',
    [
      'Choose a property or room and capture well-lit photos or a walkthrough.',
      'Review and correct the findings; AI results need your judgement.',
      'Use the findings to prepare a job. Seek professional help for urgent hazards.',
    ],
    'Properties'
  ),
  g('post-job', 'Post a job', owners, '/jobs/create', [
    'Describe the work, timing and budget for the correct property.',
    'Add clear photos and complete required contact verification.',
    'Review before posting, then compare incoming bids.',
  ]),
  g('discover', 'Find and compare contractors', owners, '/contractors', [
    'Filter by trade and location.',
    'Read reviews, verification details and portfolio examples.',
    'Save suitable contractors and discuss the job before accepting a bid.',
  ]),
  g('bids', 'Bids, quotes and contracts', owners, '/jobs', [
    'Compare scope, price, timing and exclusions.',
    'Ask questions in the job conversation.',
    'Agree the contract before funding work.',
  ]),
  g(
    'messages',
    'Messages, attachments and calls',
    [...owners, 'tenant'],
    '/messages',
    [
      'Open the relevant job conversation.',
      'Share documents and confirm access arrangements.',
      'Keep important decisions in writing and choose the alerts you want.',
    ]
  ),
  g(
    'payments',
    'Protected payments and saved cards',
    owners,
    '/payments',
    [
      'Check the contract, payer and total before checkout.',
      'Follow confirmation and distinguish held from released funds.',
      'Inspect the work before approval; use the dispute flow if needed.',
    ],
    'PaymentHistory'
  ),
  g('completion', 'Completion, reviews and disputes', owners, '/jobs', [
    'Review completion evidence against the agreed scope.',
    'Approve satisfactory work or request rework through the job.',
    'Leave a review after completion; open a dispute from the job if needed.',
  ]),
  g(
    'documents',
    'Documents, invoices and receipts',
    owners,
    '/documents',
    [
      'Open the relevant property or job records.',
      'Check status before signing or paying.',
      'Keep receipts and download available payment records.',
    ],
    'Documents'
  ),
  g(
    'portfolio',
    'Portfolio compliance and work queue',
    ['landlord', 'agency'],
    '/properties/compliance',
    [
      'Add your managed properties and check ownership scope.',
      'Record compliance documents and expiry dates.',
      'Use the work queue to prioritise maintenance.',
    ]
  ),
  g(
    'contacts',
    'Tenant invitations and reporting links',
    ['landlord', 'agency'],
    '/landlord/reporting-links',
    [
      'Add contacts and confirm their role.',
      'Send the intended property invitation or reporting link.',
      'Explain who approves and pays; revoke access when it ends.',
    ]
  ),
  g(
    'recurring',
    'Recurring maintenance',
    ['landlord', 'agency'],
    '/landlord/recurring',
    [
      'Choose the property, task, schedule and payer.',
      'Review generated jobs and contractor arrangements.',
      'Edit or pause the schedule when circumstances change.',
    ]
  ),
  g(
    'home-health',
    'Home Health',
    owners,
    '/homeowner/subscriptions/home-health',
    [
      'Review the service, price and included work.',
      'Check property and billing details before subscribing.',
      'Manage renewal or cancellation from your subscription.',
    ],
    'HomeHealthSubscribe'
  ),
  g(
    'agency',
    'Agency teams, bulk work and reports',
    ['agency'],
    '/landlord/activity-log',
    [
      'Confirm each member’s properties and permissions.',
      'Review bulk work and approval responsibilities before submitting.',
      'Follow changes in the activity log and year-over-year reports.',
    ]
  ),
  g(
    'tenant',
    'Your property invitation',
    ['tenant'],
    '/maintenance/report-access',
    [
      'Open your original invitation using the invited email.',
      'Check the property and permissions; an invitation does not transfer ownership.',
      'Report the issue with photos and follow updates. Ask the property manager about approvals and payment.',
    ]
  ),
  g(
    'business',
    'Set up your business',
    ['contractor'],
    '/contractor/onboarding',
    [
      'Add your business details and trades.',
      'Set your service area and provide relevant credentials.',
      'Complete payout setup when you are ready to receive payments.',
    ],
    'BusinessProfile'
  ),
  g(
    'verification',
    'Credentials, identity and insurance',
    ['contractor'],
    '/contractor/verification',
    [
      'Check the requirements for your trade.',
      'Submit the requested identity, credentials, insurance or background-check evidence.',
      'Track review status, corrections and renewal dates.',
    ],
    'ContractorVerification'
  ),
  g(
    'service-area',
    'Service area and nearby jobs',
    ['contractor'],
    '/contractor/service-areas',
    [
      'Choose your postcode and a realistic radius.',
      'Review matched jobs and their requirements.',
      'Use manual location entry where available if location permission is denied.',
    ],
    'ServiceAreas'
  ),
  g('find-work', 'Find work and submit bids', trades, '/contractor/jobs', [
    'Filter available work by trade and location.',
    'Include costs, availability, scope and exclusions in your bid.',
    'Track the response and agree the contract before starting.',
  ]),
  g(
    'quotes',
    'Quotes and templates',
    trades,
    '/contractor/quotes',
    [
      'Choose the customer and describe the work.',
      'Add line items, materials and exclusions.',
      'Review before sending; use templates for repeat work.',
    ],
    'QuoteBuilder'
  ),
  g(
    'trade-messages',
    'Customer messages and contracts',
    trades,
    '/contractor/messages',
    [
      'Open the job conversation and confirm scope.',
      'Share the contract and obtain the required agreement.',
      'Record agreed changes in writing.',
    ]
  ),
  g(
    'calendar',
    'Calendar and appointments',
    trades,
    '/contractor/calendar',
    [
      'Review availability and bookings.',
      'Confirm access and timing with the customer.',
      'Use rescheduling or cancellation when plans change.',
    ],
    'Calendar'
  ),
  g('evidence', 'Work evidence and sign-off', trades, '/contractor/jobs', [
    'Follow the assigned job’s start requirements.',
    'Capture required before and after photos; check camera/location permissions when prompted.',
    'Submit completion evidence and respond to approval, rework or dispute requests.',
  ]),
  g(
    'payouts',
    'Payout setup and readiness',
    ['contractor'],
    '/contractor/payouts',
    [
      'Complete the identity and bank details requested by Stripe.',
      'Return to Mintenance and confirm payouts are enabled; creating an account alone is insufficient.',
      'Check held, released and paid balances and resolve outstanding requests.',
    ],
    'Payouts'
  ),
  g(
    'crm',
    'Customers and CRM',
    ['contractor'],
    '/contractor/crm',
    [
      'Add the customer details needed for the work.',
      'Link quotes and jobs to the correct customer.',
      'Keep notes relevant and check details before contacting anyone.',
    ],
    'CRMDashboard'
  ),
  g(
    'invoices',
    'Invoices and finance',
    ['contractor'],
    '/contractor/invoices',
    [
      'Create the invoice for the correct customer and work.',
      'Review line items and payment status before sending.',
      'Distinguish invoiced amounts from received payments in finance reports.',
    ],
    'InvoiceManagement'
  ),
  g(
    'expenses',
    'Expenses',
    trades,
    '/contractor/expenses',
    [
      'Record the expense date and job.',
      'Attach supporting records where available.',
      'Review entries before using them in reports or invoices.',
    ],
    'Expenses'
  ),
  g(
    'time',
    'Time tracking',
    trades,
    '/contractor/time-tracking',
    [
      'Choose the job before adding an entry.',
      'Record actual duration and relevant notes.',
      'Check duplicate entries and the reporting period.',
    ],
    'TimeTracking'
  ),
  g(
    'reports',
    'Reports, analytics and tax records',
    ['contractor'],
    '/contractor/reporting',
    [
      'Select the reporting period.',
      'Distinguish invoices, received payouts and fees.',
      'Review earnings and tax exports against your records.',
    ],
    'Reporting'
  ),
  g(
    'marketing',
    'Portfolio, marketing and connections',
    ['contractor'],
    '/contractor/marketing',
    [
      'Add portfolio examples you have permission to share.',
      'Review your public profile and business card.',
      'Explore connections and market insights as your business grows.',
    ],
    'Marketing'
  ),
  g(
    'team-owner',
    'Invite your team',
    ['contractor'],
    '/contractor/team',
    [
      'Choose the correct email and role.',
      'Explain assigned work and what the member can change.',
      'Review membership and remove access when no longer needed.',
    ],
    'Team'
  ),
  g(
    'team-member',
    'Join your contractor team',
    ['team-member'],
    '/contractor/team',
    [
      'Accept the original invitation using the invited account.',
      'Review your role and assigned work.',
      'Use scheduling, messages and evidence within your permissions; ask the owner about business and bank settings.',
    ],
    'Team'
  ),
  g(
    'reviews',
    'Reviews and reputation',
    trades,
    '/contractor/reviews',
    [
      'Read feedback in the context of the completed job.',
      'Reply factually without revealing private customer information.',
      'Report content that needs moderation.',
    ],
    'Reviews'
  ),
  g(
    'benefits-home',
    'Your plan and early-user benefits',
    owners,
    '/homeowner/subscription',
    [
      'Review the benefits actually available to your account.',
      'A confirmed early-access award is separate from a waitlist or trial.',
      'Check billing terms before buying any separate service.',
    ],
    'Subscription'
  ),
  g(
    'benefits-trade',
    'Your plan and platform fee',
    trades,
    '/contractor/subscription',
    [
      'Review your benefits and any active subscription.',
      'Early-access grants include their stated features without a monthly plan charge.',
      'Check your effective platform fee and separate service charges.',
    ],
    'Subscription'
  ),
  g(
    'notifications',
    'Notifications and accessibility',
    all,
    '/settings/notifications',
    [
      'Choose the updates you want.',
      'Use system settings for denied push permissions, or read the in-app inbox.',
      'Review accessibility settings and revisit these guides at any time.',
    ],
    'NotificationPreferences'
  ),
  g(
    'admin-security',
    'Admin security and audit trail',
    ['admin'],
    '/admin/security',
    [
      'Set up required security and confirm your permissions.',
      'Use the audit trail when investigating changes.',
      'Keep customer information within approved review tools.',
    ]
  ),
  g(
    'admin-review',
    'Verification and moderation queues',
    ['admin'],
    '/admin/verifications',
    [
      'Open the correct verification, job or moderation queue.',
      'Inspect evidence and apply the review criteria.',
      'Record the decision and explain corrections or escalation.',
    ]
  ),
  g(
    'admin-money',
    'Disputes and payment review',
    ['admin'],
    '/admin/disputes',
    [
      'Inspect the job, contract, evidence and payment status.',
      'Follow approval and security steps for financial actions.',
      'Verify the resulting status and retain the audit record.',
    ]
  ),
  g(
    'admin-operations',
    'AI, communications and retention',
    ['admin'],
    '/admin/dashboard',
    [
      'Review AI and analytics signals alongside source evidence.',
      'Check audience and content before communications.',
      'Use retention, export and disposal tools within the required review process.',
    ]
  ),
  g(
    'help',
    'Help and account management',
    all,
    '/help',
    [
      'Search Help for the feature or issue.',
      'Use account settings for privacy, export and deletion.',
      'Reopen Getting started to revisit guidance; guides do not grant additional permissions.',
    ],
    'HelpCenter'
  ),
];
export function guidesForPersona(persona: OnboardingPersona): FeatureGuide[] {
  const first: Record<OnboardingPersona, string> = {
    homeowner: 'properties',
    landlord: 'portfolio',
    agency: 'agency',
    tenant: 'tenant',
    contractor: 'business',
    'team-member': 'team-member',
    admin: 'admin-security',
  };
  return FEATURE_GUIDES.filter((g) => g.personas.includes(persona)).sort(
    (a, b) => Number(b.id === first[persona]) - Number(a.id === first[persona])
  );
}
export function earlyAccessBenefits(role: string, fee?: string) {
  return role === 'contractor'
    ? {
        title: 'Your early-user benefits are active',
        description:
          'Your early-access grant includes Business features without a monthly subscription charge.',
        items: [
          'Enterprise feature access',
          'Priority support and advanced analytics',
          ...(fee
            ? [`Your current platform fee: ${fee}`]
            : ['Check your current platform fee in your subscription summary']),
        ],
      }
    : {
        title: 'Your early-user benefits are active',
        description:
          'Your early-access grant includes Agency features without a monthly subscription charge.',
        items: [
          'Agency feature access',
          'Portfolio and property management tools',
          'Team access and reporting tools',
        ],
      };
}
