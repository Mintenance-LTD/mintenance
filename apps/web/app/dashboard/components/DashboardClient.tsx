'use client';

import React from 'react';
import { DashboardWithAirbnbSearch } from './DashboardWithAirbnbSearch';

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
    recentActivity: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
    }>;
  };
}

const DashboardClient: React.FC<DashboardClientProps> = ({ data }) => {
  return <DashboardWithAirbnbSearch data={data} />;
};

export { DashboardClient };
