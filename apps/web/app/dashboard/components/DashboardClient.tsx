'use client';

import React from 'react';
import { DashboardWithAirbnbSearch } from './DashboardWithAirbnbSearch';
import type { MaintenanceRecommendation } from '@/lib/services/RecommendationsService';

interface DashboardClientProps {
  data: {
    homeowner: {
      id: string;
      name: string;
      avatar?: string;
      location: string;
      email: string;
    };
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

const DashboardClient: React.FC<DashboardClientProps> = ({ data }) => {
  return <DashboardWithAirbnbSearch data={data} />;
};

export { DashboardClient };
