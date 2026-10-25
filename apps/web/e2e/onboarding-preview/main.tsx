import React from 'react';
import { createRoot } from 'react-dom/client';
import { MintEditorialContractorShell } from '../../app/contractor/components/mint-editorial/MintEditorialContractorShell';
import { MintEditorialContractorDashboard } from '../../app/contractor/(dashboard)/dashboard-enhanced/MintEditorialContractorDashboard';
import '../../app/globals.css';
import { MintEditorialHomeownerDashboard } from '../../app/dashboard/components/MintEditorialHomeownerDashboard';
import { OnboardingWrapper } from '../../components/onboarding/OnboardingWrapper';
import { GuideHub } from '../../components/onboarding/GuideHub';
// This isolated fixture uses the real dashboard, onboarding components and CSS.
// API responses are deterministic sample data. No live auth or database is used.
const query = new URLSearchParams(window.location.search);
const contractor = query.get('role') === 'contractor';
const unavailable = query.get('progress') === 'unavailable';
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input);
  if (url === '/api/csrf')
    return Response.json({ token: 'local-fixture-token' });
  if (url === '/api/onboarding/progress')
    return Response.json({ progress: [] }, { status: unavailable ? 503 : 200 });
  if (url === '/api/subscriptions/status')
    return Response.json({
      role: contractor ? 'contractor' : 'homeowner',
      earlyAccess: { eligible: query.get('benefits') !== 'false' },
    });
  if (url === '/api/notifications/unread-count')
    return Response.json({ count: 3 });
  if (url.startsWith('/api/')) return Response.json({});
  return nativeFetch(input, init);
};
const data = {
  homeowner: {
    id: 'visual-test',
    name: 'Alex Morgan',
    email: 'alex@example.test',
    location: 'London',
    role: 'homeowner',
  },
  properties: [],
  metrics: {
    activeJobs: 2,
    completedJobs: 5,
    heldInEscrow: 450,
    totalSpent: 1500,
    savedContractors: 2,
  },
  activeJobs: [
    {
      id: 'sample-1',
      title: 'Kitchen tap repair',
      status: 'in_progress',
      budget: 180,
      category: 'plumbing',
      contractor: { name: 'Oak Home Services' },
      progress: 50,
      bidsCount: 2,
    },
    {
      id: 'sample-2',
      title: 'Garden maintenance',
      status: 'posted',
      budget: 270,
      category: 'landscaping',
      progress: 0,
      bidsCount: 3,
    },
  ],
  pendingBids: [],
  recentActivity: [],
  upcomingAppointments: [],
  needsYou: [],
};
const tradeData = {
  contractor: {
    id: 'visual-test',
    name: 'Alex Morgan',
    email: 'alex@example.test',
    location: 'London',
  },
  metrics: {
    totalRevenue: 1500,
    revenueChange: 12,
    activeJobs: 2,
    completedJobs: 5,
    pendingBids: 1,
    completionRate: 100,
    pendingEscrowAmount: 450,
    pendingEscrowCount: 2,
  },
  recentJobs: [],
  availableJobs: [],
  hasPaymentSetup: true,
  subscriptionInfo: null,
};
const wrapped = (
  <OnboardingWrapper
    userId={`visual-test-${query.get('case') ?? 'default'}`}
    userType={contractor ? 'contractor' : 'homeowner'}
    audience={
      contractor
        ? query.get('member') === 'true'
          ? 'team-member'
          : 'contractor'
        : undefined
    }
    autoStart={query.get('tour') === 'true'}
  >
    {contractor ? (
      <MintEditorialContractorDashboard data={tradeData} />
    ) : (
      <MintEditorialHomeownerDashboard data={data} />
    )}
  </OnboardingWrapper>
);
createRoot(document.getElementById('root')!).render(
  window.location.pathname === '/getting-started' ? (
    <GuideHub
      userId={`visual-test-${query.get('case') ?? 'default'}`}
      role={contractor ? 'contractor' : 'homeowner'}
      tourAudience={
        contractor
          ? query.get('member') === 'true'
            ? 'team-member'
            : 'contractor'
          : 'homeowner'
      }
      initialPersona={
        query.get('member') === 'true' ? 'team-member' : undefined
      }
    />
  ) : contractor ? (
    <MintEditorialContractorShell contractorName='Alex Morgan'>
      {wrapped}
    </MintEditorialContractorShell>
  ) : (
    wrapped
  )
);
