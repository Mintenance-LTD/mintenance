export interface ReportingAnalytics {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  pendingJobs: number;
  cancelledJobs: number;
  totalRevenue: number;
  totalClients: number;
  activeClients: number;
  averageJobValue: number;
  customerSatisfaction: number;
  jobsByCategory: Array<{ category: string; count: number; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; jobs: number }>;
  topClients: Array<{ name: string; revenue: number; jobs: number }>;
  totalBids: number;
  acceptedBids: number;
  winRate: number;
  dailyRevenue: Array<{ date: string; revenue: number; jobs: number }>;
  revenueChange: number;
  jobsChange: number;
  avgValueChange: number;
  satisfactionChange: number;
}

export type DateRange =
  | '7days'
  | '30days'
  | '3months'
  | '6months'
  | 'year'
  | 'custom';
