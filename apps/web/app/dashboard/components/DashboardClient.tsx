import React from 'react';
import { cookies } from 'next/headers';
import { DashboardWithAirbnbSearch } from './DashboardWithAirbnbSearch';
import { MintEditorialHomeownerDashboard } from './MintEditorialHomeownerDashboard';
import type { MaintenanceRecommendation } from '@/lib/services/RecommendationsService';
import type { Property } from './dashboard-search-types';

interface DashboardClientProps {
  data: {
    homeowner: {
      id: string;
      name: string;
      avatar?: string;
      location: string;
      email: string;
    };
    properties: Property[];
    metrics: {
      totalSpent: number;
      activeJobs: number;
      completedJobs: number;
      savedContractors: number;
    };
    activeJobs: Array<{
      id: string;
      title: string;
      status: string;
      budget: number;
      category?: string;
      contractor?: {
        name: string;
        image?: string;
      };
      progress: number;
      bidsCount: number;
      scheduledDate?: string;
      photoUrl?: string | null;
      escrowAmount?: number;
    }>;
    pendingBids?: Array<{
      id: string;
      amount: number;
      jobId: string;
      jobTitle: string;
      contractorName: string;
      contractorImage?: string;
      createdAt: string;
    }>;
    recentActivity: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
    }>;
    upcomingAppointments?: Array<{
      id: string;
      title: string;
      date: string;
      time: string;
      endTime?: string;
      locationType?: string;
      status: string;
      contractor?: { name: string };
    }>;
    recommendations?: MaintenanceRecommendation[];
  };
}

const DashboardClient: React.FC<DashboardClientProps> = async ({ data }) => {
  // Phase-1 design rebrand. Cookie is set via Settings -> Appearance
  // (also readable by /api/theme directly); root layout reads the same
  // cookie to attach <html data-theme>. Pick the matching dashboard
  // surface here so the data prop only needs to flow into one tree.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return <MintEditorialHomeownerDashboard data={data} />;
  }
  return <DashboardWithAirbnbSearch data={data} />;
};

export { DashboardClient };
