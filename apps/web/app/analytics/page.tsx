'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/lib/supabase';
import {
  PoundSterling,
  CheckCircle,
  Hammer,
  BarChart3,
  HardHat,
  Home,
} from 'lucide-react';
import { MintEditorialAnalytics } from './MintEditorialAnalytics';
import { LegacyAnalyticsView } from './LegacyAnalyticsView';

interface Job {
  id: string;
  created_at: string;
  status: string;
  category?: string;
  [key: string]: unknown;
}

// Escrow rows we count as "spent". Mirrors the same statuses
// /financials and /dashboard fold into the totalSpent KPI. Only
// `pending` (pre-charge) and `refunded` stay out.
interface EscrowRow {
  amount: number;
  status: string;
  job_id: string | null;
  released_at: string | null;
  created_at: string;
}
const SPENT_STATUSES = new Set([
  'held',
  'release_pending',
  'released',
  'completed',
]);

interface MetricIcon {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

export default function AnalyticsPage2025() {
  const { user } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<
    'week' | 'month' | 'quarter' | 'year'
  >('month');
  const [loading, setLoading] = useState(true);

  // Mint Editorial theme detection — swap the entire content area
  // for the canonical-classes port (.t-h1 / .kpi / .chip / .card)
  // when the cookie is on. Legacy Tailwind layout below stays for
  // default-theme users.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);
  const [spendingData, setSpendingData] = useState<
    Array<{ month: string; spending: number; jobs: number }>
  >([]);
  const [categoryData, setCategoryData] = useState<
    Array<{ category: string; spending: number }>
  >([]);
  const [metrics, setMetrics] = useState<MetricIcon[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user?.id) return;

      setLoading(true);
      try {
        // Bridge: legacy `payments` table has 0 rows in production —
        // all real money flows live in `escrow_transactions`. Same
        // fix /financials shipped in W4. Two parallel queries:
        //   1. jobs[]  → category + status lookup (no embed)
        //   2. escrow[] → amount + status (where payer_id = me)
        // Joined in JS on job_id so we can bucket per-category and
        // per-month from a real-data source.
        const [jobsResult, escrowResult] = await Promise.all([
          supabase
            .from('jobs')
            .select('id, title, category, status, created_at')
            .eq('homeowner_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
          supabase
            .from('escrow_transactions')
            .select('amount, status, job_id, released_at, created_at')
            .eq('payer_id', user.id),
        ]);

        if (jobsResult.error) throw jobsResult.error;
        if (escrowResult.error) throw escrowResult.error;

        const jobs = (jobsResult.data || []) as Job[];
        const escrowRows = (escrowResult.data || []) as EscrowRow[];

        // Index jobs by id so the escrow loop can find category in O(1).
        const jobsById = new Map<string, Job>();
        jobs.forEach((j) => jobsById.set(j.id, j));

        // Calculate spending by month
        const monthlySpending = new Map<
          string,
          { spending: number; jobs: number }
        >();
        const categorySpending = new Map<string, number>();
        let totalSpent = 0;
        let completedJobs = 0;
        let activeJobs = 0;

        jobs.forEach((job) => {
          if (job.status === 'completed') completedJobs++;
          if (job.status === 'in_progress' || job.status === 'posted')
            activeJobs++;
        });

        escrowRows
          .filter((e) => SPENT_STATUSES.has(e.status))
          .forEach((escrow) => {
            const amount = Number(escrow.amount) || 0;
            totalSpent += amount;

            // Prefer release date when the funds actually moved;
            // otherwise the escrow creation date.
            const dateStr = escrow.released_at || escrow.created_at;
            const date = new Date(dateStr);
            const monthKey = date.toLocaleDateString('en-GB', {
              month: 'short',
            });

            const existingMonth = monthlySpending.get(monthKey) || {
              spending: 0,
              jobs: 0,
            };
            monthlySpending.set(monthKey, {
              spending: existingMonth.spending + amount,
              jobs: existingMonth.jobs + 1,
            });

            // Resolve category from the linked job.
            const job = escrow.job_id ? jobsById.get(escrow.job_id) : null;
            const category = job?.category || 'Other';
            categorySpending.set(
              category,
              (categorySpending.get(category) || 0) + amount
            );
          });

        // Convert maps to arrays
        const spendingArray = Array.from(monthlySpending.entries())
          .map(([month, data]) => ({ month, ...data }))
          .slice(0, 6);

        const categoryArray = Array.from(categorySpending.entries())
          .map(([category, spending]) => ({ category, spending }))
          .sort((a, b) => b.spending - a.spending)
          .slice(0, 5);

        setSpendingData(spendingArray);
        setCategoryData(categoryArray);

        // Calculate metrics
        const avgJobCost = completedJobs > 0 ? totalSpent / completedJobs : 0;

        // Get unique contractors
        const { data: uniqueContractors } = await supabase
          .from('jobs')
          .select('contractor_id')
          .eq('homeowner_id', user.id)
          .is('deleted_at', null)
          .not('contractor_id', 'is', null);

        const contractorCount = new Set(
          uniqueContractors?.map((j) => j.contractor_id)
        ).size;

        // Get properties count
        const { count: propertiesCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('homeowner_id', user.id);

        // Period-over-period deltas are dropped until a real
        // comparison query lands. Previous values (`+18%`, `+12%`,
        // `+5%`, `+contractorCount`) were hardcoded placeholders that
        // lied to the homeowner — violates the Phase-2 "no fake data"
        // rule. Empty `change` + neutral changeType renders cleanly on
        // both legacy and Mint Editorial views.
        setMetrics([
          {
            label: 'Total Spent',
            value: `£${totalSpent.toLocaleString()}`,
            change: '',
            changeType: 'neutral',
            icon: <PoundSterling className='w-5 h-5' />,
          },
          {
            label: 'Jobs Completed',
            value: completedJobs.toString(),
            change: '',
            changeType: 'neutral',
            icon: <CheckCircle className='w-5 h-5' />,
          },
          {
            label: 'Active Projects',
            value: activeJobs.toString(),
            change: '',
            changeType: 'neutral',
            icon: <Hammer className='w-5 h-5' />,
          },
          {
            label: 'Avg Job Cost',
            value: `£${Math.round(avgJobCost).toLocaleString()}`,
            change: '',
            changeType: 'neutral',
            icon: <BarChart3 className='w-5 h-5' />,
          },
          {
            label: 'Contractors Hired',
            value: contractorCount.toString(),
            change: '',
            changeType: 'neutral',
            icon: <HardHat className='w-5 h-5' />,
          },
          {
            label: 'Properties',
            value: (propertiesCount || 0).toString(),
            change: '',
            changeType: 'neutral',
            icon: <Home className='w-5 h-5' />,
          },
        ]);
      } catch (error) {
        logger.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user?.id, selectedPeriod]);

  if (isMintEditorial) {
    return (
      <HomeownerPageWrapper>
        <MintEditorialAnalytics
          loading={loading}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          metrics={metrics}
          spendingData={spendingData}
          categoryData={categoryData}
        />
      </HomeownerPageWrapper>
    );
  }

  return (
    <LegacyAnalyticsView
      loading={loading}
      selectedPeriod={selectedPeriod}
      onPeriodChange={setSelectedPeriod}
      metrics={metrics}
      spendingData={spendingData}
      categoryData={categoryData}
    />
  );
}
