'use client';

import Link from 'next/link';
import { Search, Plus, Bell, FileText } from 'lucide-react';
import { MintEditorialSidebar } from './mint-editorial/MintEditorialSidebar';
import { MintEditorialJobsPanel } from './mint-editorial/MintEditorialJobsPanel';
import { MintEditorialSidePanel } from './mint-editorial/MintEditorialSidePanel';
import { MintEditorialDock } from './mint-editorial/MintEditorialDock';
import {
  formatGBP,
  type DashboardData,
} from './mint-editorial/dashboardHelpers';

export function MintEditorialHomeownerDashboard({
  data,
}: {
  data: DashboardData;
}) {
  const { homeowner, metrics, activeJobs, pendingBids, upcomingAppointments } =
    data;
  const escrowHeld = metrics.totalSpent;
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const firstName = homeowner.name?.split(' ')[0] || 'there';
  const bidsWaiting = pendingBids?.length ?? 0;
  const topBid = pendingBids?.[0];

  return (
    <div className='me-root' style={{ display: 'flex' }}>
      <MintEditorialSidebar
        homeownerName={homeowner.name}
        email={homeowner.email}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Topbar */}
        <div className='me-topbar'>
          <div className='search-pill' style={{ width: 360 }}>
            <Search size={15} strokeWidth={1.75} />
            <span>Search jobs, contractors, invoices</span>
          </div>
          <div style={{ flex: 1 }} />
          <Link href='/notifications' className='btn btn-ghost btn-sm'>
            <Bell size={15} strokeWidth={1.75} />
          </Link>
          <Link href='/jobs/create' className='btn btn-primary btn-sm'>
            <Plus size={14} strokeWidth={2} /> Post a job
          </Link>
        </div>

        <div style={{ padding: '28px 36px 140px', flex: 1 }}>
          {/* Greeting */}
          <div className='between' style={{ marginBottom: 22 }}>
            <div className='col' style={{ gap: 6 }}>
              <div className='t-eyebrow'>{today}</div>
              <h1 className='t-h1'>Good day, {firstName}.</h1>
              <p className='t-body' style={{ maxWidth: 540 }}>
                {activeJobs.length === 0
                  ? 'Nothing on your plate. When you post a job, verified local tradespeople will respond with bids.'
                  : `You have ${activeJobs.length} active ${activeJobs.length === 1 ? 'job' : 'jobs'} and ${bidsWaiting} ${bidsWaiting === 1 ? 'bid' : 'bids'} waiting for you.`}
              </p>
            </div>
            <div className='row' style={{ gap: 8 }}>
              <Link href='/financials' className='btn btn-secondary btn-sm'>
                <FileText size={14} strokeWidth={1.75} /> Export
              </Link>
              <Link href='/jobs/create' className='btn btn-primary'>
                <Plus size={14} strokeWidth={2} /> New job
              </Link>
            </div>
          </div>

          {/* KPI row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 14,
              marginBottom: 22,
            }}
          >
            <div className='kpi'>
              <div className='label'>Active jobs</div>
              <div className='num'>{metrics.activeJobs}</div>
              <div className='sub'>
                <span>across your properties</span>
              </div>
            </div>
            <div className='kpi'>
              <div className='label'>Open bids</div>
              <div className='num'>{bidsWaiting}</div>
              <div className='sub'>
                <span>awaiting review</span>
              </div>
            </div>
            <div className='kpi'>
              <div className='label'>Held in escrow</div>
              <div className='num'>{formatGBP(escrowHeld)}</div>
              <div className='sub'>
                <span>released on sign-off</span>
              </div>
            </div>
            <div className='kpi'>
              <div className='label'>Completed</div>
              <div className='num'>{metrics.completedJobs}</div>
              <div className='sub'>
                <span>all-time jobs</span>
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
              gap: 18,
            }}
          >
            <MintEditorialJobsPanel activeJobs={activeJobs} />
            <MintEditorialSidePanel
              topBid={topBid}
              appointments={upcomingAppointments ?? []}
              escrowHeld={escrowHeld}
            />
          </div>
        </div>

        <MintEditorialDock />
      </div>
    </div>
  );
}
