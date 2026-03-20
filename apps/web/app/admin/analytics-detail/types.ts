export interface DashboardMetrics {
  totalUsers: number;
  totalContractors: number;
  totalJobs: number;
  activeSubscriptions: number;
  mrr: number;
  pendingVerifications: number;
  charts?: {
    userGrowth: Array<{ date: string; users: number; cumulative: number }>;
    jobGrowth: Array<{ date: string; jobs: number; cumulative: number }>;
  };
}

export interface RevenueData {
  revenueMetrics: {
    totalRevenue: number;
    platformFees: number;
    subscriptionRevenue: number;
    avgJobValue: number;
  };
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    fees: number;
    subscriptions: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    created_at: string;
    description?: string;
  }>;
}
