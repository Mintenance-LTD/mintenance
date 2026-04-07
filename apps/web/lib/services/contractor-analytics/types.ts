export type JobMetricsRow = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CompletedJobRow = {
  id: string;
  budget: number | null;
  created_at: string;
  status: string;
};

export type TransactionRow = {
  amount: number;
  status?: string | null;
  created_at?: string;
};

export type ReviewRow = {
  rating: number;
  comment?: string | null;
  created_at: string;
};

export type ContractorSkillRow = {
  skill_name: string;
};

export type SkillJobRow = {
  budget: number | null;
  reviews?: { rating: number }[] | null;
};

export type BidWithJobRow = {
  created_at: string;
  status: string;
  jobs?: { created_at: string }[] | null;
};

export interface ContractorAnalytics {
  // Performance Metrics
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  pendingJobs: number;
  completionRate: number;

  // Financial Metrics
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  averageJobValue: number;
  pendingPayments: number;

  // Rating & Feedback
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };

  // Response & Quality Metrics
  averageResponseTime: number; // in hours
  jobSuccessRate: number;
  customerReturnRate: number;

  // Growth Metrics
  monthlyJobTrends: MonthlyTrend[];
  earningsTrends: MonthlyTrend[];
  ratingTrends: MonthlyTrend[];

  // Comparative Metrics
  industryRankPercentile: number;
  topSkills: SkillPerformance[];
  marketPositioning: MarketPosition;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  value: number;
  change: number; // percentage change from previous month
}

export interface SkillPerformance {
  skillName: string;
  jobCount: number;
  averageRating: number;
  averageEarnings: number;
  demandLevel: 'high' | 'medium' | 'low';
  proficiencyScore: number;
}

export interface MarketPosition {
  localRanking: number;
  localTotal: number;
  categoryRanking: number;
  categoryTotal: number;
  competitorComparison: {
    betterThan: number; // percentage
    similarTo: number; // percentage
  };
}

export interface PerformanceInsight {
  type: 'strength' | 'opportunity' | 'warning' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendedActions?: string[];
}
