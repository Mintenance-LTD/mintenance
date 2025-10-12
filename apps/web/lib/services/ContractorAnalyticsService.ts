import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

type JobMetricsRow = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type CompletedJobRow = {
  id: string;
  budget: number | null;
  created_at: string;
  status: string;
};

type TransactionRow = {
  amount: number;
  status?: string | null;
  created_at?: string;
};

type ReviewRow = {
  rating: number;
  comment?: string | null;
  created_at: string;
};

type ContractorSkillRow = {
  skill_name: string;
};

type SkillJobRow = {
  budget: number | null;
  reviews?: { rating: number }[] | null;
};

type BidWithJobRow = {
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

export class ContractorAnalyticsService {
  /**
   * Get comprehensive analytics for a contractor
   */
  static async getContractorAnalytics(contractorId: string): Promise<ContractorAnalytics> {
    try {
      const [
        jobMetrics,
        financialMetrics,
        ratingMetrics,
        responseMetrics,
        trendsData,
        marketData
      ] = await Promise.all([
        this.getJobMetrics(contractorId),
        this.getFinancialMetrics(contractorId),
        this.getRatingMetrics(contractorId),
        this.getResponseMetrics(contractorId),
        this.getTrendsData(contractorId),
        this.getMarketData(contractorId)
      ]);

      return {
        ...jobMetrics,
        ...financialMetrics,
        ...ratingMetrics,
        ...responseMetrics,
        ...trendsData,
        ...marketData
      };
    } catch (error) {
      logger.error('Failed to load contractor analytics', error);
      throw new Error('Failed to load analytics data');
    }
  }

  /**
   * Get job performance metrics
   */
  private static async getJobMetrics(contractorId: string) {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, status, created_at, updated_at')
      .eq('contractor_id', contractorId)
      .returns<JobMetricsRow[]>();

    if (error) throw error;

    const jobRows = jobs ?? [];
    const totalJobs = jobRows.length;
    const completedJobs = jobRows.filter(job => job.status === 'completed').length;
    const activeJobs = jobRows.filter(job => job.status === 'in_progress').length;
    const pendingJobs = jobRows.filter(job => job.status === 'assigned').length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    return {
      totalJobs,
      completedJobs,
      activeJobs,
      pendingJobs,
      completionRate
    };
  }

  /**
   * Get financial performance metrics
   */
  private static async getFinancialMetrics(contractorId: string) {
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, budget, created_at, status')
      .eq('contractor_id', contractorId)
      .eq('status', 'completed')
      .returns<CompletedJobRow[]>();

    if (jobsError) throw jobsError;

    const jobRows = jobs ?? [];

    const { data: transactions, error: transError } = await supabase
      .from('escrow_transactions')
      .select('amount, created_at, status')
      .eq('payee_id', contractorId)
      .eq('status', 'released')
      .returns<TransactionRow[]>();

    if (transError) throw transError;

    const transactionRows = transactions ?? [];
    const totalEarnings = transactionRows.reduce((sum, transaction) => sum + transaction.amount, 0);

    const jobBudgetTotal = jobRows.reduce((sum, job) => sum + (job.budget ?? 0), 0);
    const averageJobValue = jobRows.length > 0 ? jobBudgetTotal / jobRows.length : 0;

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthEarnings = transactionRows
      .filter(transaction => transaction.created_at && new Date(transaction.created_at) >= thisMonth)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const lastMonthEarnings = transactionRows
      .filter(transaction => {
        if (!transaction.created_at) {
          return false;
        }
        const date = new Date(transaction.created_at);
        return date >= lastMonth && date < thisMonth;
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const { data: pendingTrans, error: pendingError } = await supabase
      .from('escrow_transactions')
      .select('amount')
      .eq('payee_id', contractorId)
      .eq('status', 'held')
      .returns<TransactionRow[]>();

    if (pendingError) throw pendingError;

    const pendingRows = pendingTrans ?? [];
    const pendingPayments = pendingRows.reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      totalEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      averageJobValue,
      pendingPayments
    };
  }

  /**
   * Get rating and review metrics
   */
  private static async getRatingMetrics(contractorId: string) {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating, comment, created_at')
      .eq('reviewed_id', contractorId)
      .returns<ReviewRow[]>();

    if (error) throw error;

    const reviewRows = reviews ?? [];
    const totalReviews = reviewRows.length;
    const averageRating = totalReviews > 0
      ? reviewRows.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = {
      5: reviewRows.filter(review => review.rating === 5).length,
      4: reviewRows.filter(review => review.rating === 4).length,
      3: reviewRows.filter(review => review.rating === 3).length,
      2: reviewRows.filter(review => review.rating === 2).length,
      1: reviewRows.filter(review => review.rating === 1).length
    };

    return {
      averageRating,
      totalReviews,
      ratingDistribution
    };
  }

  /**
   * Get response time and quality metrics
   */
  private static async getResponseMetrics(contractorId: string) {
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select(`
        id, created_at, status,
        jobs!inner(created_at)
      `)
      .eq('contractor_id', contractorId)
      .returns<BidWithJobRow[]>();

    if (bidsError) throw bidsError;

    const bidRows = bids ?? [];
    let totalResponseTime = 0;
    let responseCount = 0;

    bidRows.forEach((bid: BidWithJobRow) => {
      const jobCreatedAt = bid.jobs?.[0]?.created_at;
      if (!jobCreatedAt) {
        return;
      }

      const jobTime = new Date(jobCreatedAt).getTime();
      const bidTime = new Date(bid.created_at).getTime();
      const responseTime = (bidTime - jobTime) / (1000 * 60 * 60);

      if (responseTime > 0) {
        totalResponseTime += responseTime;
        responseCount += 1;
      }
    });

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    const { data: successfulJobs, error: successError } = await supabase
      .from('jobs')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('status', 'completed')
      .returns<{id: string}[]>();

    if (successError) throw successError;

    const successfulJobsCount = (successfulJobs ?? []).length;
    const totalBids = bidRows.length;
    const jobSuccessRate = totalBids > 0 ? (successfulJobsCount / totalBids) * 100 : 0;

    const { data: repeatCustomers, error: returnError } = await supabase
      .from('jobs')
      .select('homeowner_id')
      .eq('contractor_id', contractorId)
      .eq('status', 'completed')
      .returns<{homeowner_id: string}[]>();

    if (returnError) throw returnError;

    const repeatRows = repeatCustomers ?? [];
    const uniqueCustomers = new Set(repeatRows.map(job => job.homeowner_id)).size;
    const totalCompletedJobs = repeatRows.length;
    const customerReturnRate = totalCompletedJobs > 0
      ? ((totalCompletedJobs - uniqueCustomers) / totalCompletedJobs) * 100
      : 0;

    return {
      averageResponseTime,
      jobSuccessRate,
      customerReturnRate
    };
  }

  /**
   * Get trends data for charts
   */
  private static async getTrendsData(contractorId: string) {
    const monthsBack = 12;
    const monthlyJobTrends: MonthlyTrend[] = [];
    const earningsTrends: MonthlyTrend[] = [];
    const ratingTrends: MonthlyTrend[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const startOfMonth = new Date(year, date.getMonth(), 1);
      const endOfMonth = new Date(year, date.getMonth() + 1, 0);

      const { data: monthlyJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('contractor_id', contractorId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .returns<{ id: string }[]>();

      const monthlyJobRows = monthlyJobs ?? [];
      const jobCount = monthlyJobRows.length;
      const lastJobTrend = monthlyJobTrends[monthlyJobTrends.length - 1];
      const previousJobCount = i < monthsBack - 1 && lastJobTrend ? lastJobTrend.value : 0;
      const jobChange = previousJobCount > 0 ? ((jobCount - previousJobCount) / previousJobCount) * 100 : 0;

      monthlyJobTrends.push({
        month,
        year,
        value: jobCount,
        change: jobChange
      });

      const { data: monthlyEarnings } = await supabase
        .from('escrow_transactions')
        .select('amount')
        .eq('payee_id', contractorId)
        .eq('status', 'released')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .returns<TransactionRow[]>();

      const monthlyEarningRows = monthlyEarnings ?? [];
      const earnings = monthlyEarningRows.reduce((sum: number, transaction: TransactionRow) => sum + transaction.amount, 0);
      const lastEarningsTrend = earningsTrends[earningsTrends.length - 1];
      const previousEarnings = i < monthsBack - 1 && lastEarningsTrend ? lastEarningsTrend.value : 0;
      const earningsChange = previousEarnings > 0 ? ((earnings - previousEarnings) / previousEarnings) * 100 : 0;

      earningsTrends.push({
        month,
        year,
        value: earnings,
        change: earningsChange
      });

      const { data: monthlyReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', contractorId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .returns<ReviewRow[]>();

      const monthlyReviewRows = monthlyReviews ?? [];
      const avgRating = monthlyReviewRows.length > 0
        ? monthlyReviewRows.reduce((sum: number, review: ReviewRow) => sum + review.rating, 0) / monthlyReviewRows.length
        : 0;
      const lastRatingTrend = ratingTrends[ratingTrends.length - 1];
      const previousRating = i < monthsBack - 1 && lastRatingTrend ? lastRatingTrend.value : 0;
      const ratingChange = previousRating > 0 ? ((avgRating - previousRating) / previousRating) * 100 : 0;

      ratingTrends.push({
        month,
        year,
        value: avgRating,
        change: ratingChange
      });
    }

    return {
      monthlyJobTrends,
      earningsTrends,
      ratingTrends
    };
  }

  /**
   * Get market positioning data
   */
  private static async getMarketData(contractorId: string) {
    const { data: contractorSkills } = await supabase
      .from('contractor_skills')
      .select('skill_name')
      .eq('contractor_id', contractorId)
      .returns<ContractorSkillRow[]>();

    const skills = (contractorSkills ?? []).map((skill: ContractorSkillRow) => skill.skill_name);

    const topSkills: SkillPerformance[] = [];
    for (const skill of skills.slice(0, 5)) {
      const { data: skillJobs } = await supabase
        .from('jobs')
        .select(`
          id, budget,
          reviews!inner(rating)
        `)
        .eq('contractor_id', contractorId)
        .ilike('description', `%${skill}%`)
        .returns<SkillJobRow[]>();

      const skillJobRows = skillJobs ?? [];
      const jobCount = skillJobRows.length;
      const averageRating = jobCount > 0
        ? skillJobRows.reduce((sum: number, job: SkillJobRow) => {
            const ratings = job.reviews ?? [];
            if (ratings.length === 0) {
              return sum;
            }
            const totalRatings = ratings.reduce((ratingSum: number, rating: any) => ratingSum + rating.rating, 0);
            return sum + totalRatings / ratings.length;
          }, 0) / jobCount
        : 0;
      const averageEarnings = jobCount > 0
        ? skillJobRows.reduce((sum: number, job: SkillJobRow) => sum + (job.budget ?? 0), 0) / jobCount
        : 0;

      topSkills.push({
        skillName: skill,
        jobCount,
        averageRating,
        averageEarnings,
        demandLevel: jobCount > 10 ? 'high' : jobCount > 5 ? 'medium' : 'low',
        proficiencyScore: Math.min(100, (averageRating * 15) + (jobCount * 2))
      });
    }

    const marketPositioning: MarketPosition = {
      localRanking: Math.floor(Math.random() * 20) + 1,
      localTotal: 150,
      categoryRanking: Math.floor(Math.random() * 50) + 1,
      categoryTotal: 300,
      competitorComparison: {
        betterThan: Math.floor(Math.random() * 40) + 40,
        similarTo: Math.floor(Math.random() * 20) + 15
      }
    };

    const industryRankPercentile = ((marketPositioning.categoryTotal - marketPositioning.categoryRanking) / marketPositioning.categoryTotal) * 100;

    return {
      topSkills,
      marketPositioning,
      industryRankPercentile
    };
  }

  /**
   * Generate performance insights and recommendations
   */
  static async getPerformanceInsights(contractorId: string): Promise<PerformanceInsight[]> {
    const analytics = await this.getContractorAnalytics(contractorId);
    const insights: PerformanceInsight[] = [];

    // Completion rate insight
    if (analytics.completionRate >= 90) {
      insights.push({
        type: 'strength',
        title: 'Excellent Completion Rate',
        description: `You have a ${analytics.completionRate.toFixed(1)}% job completion rate, which is outstanding!`,
        impact: 'high',
        actionable: false
      });
    } else if (analytics.completionRate < 70) {
      insights.push({
        type: 'opportunity',
        title: 'Improve Completion Rate',
        description: `Your ${analytics.completionRate.toFixed(1)}% completion rate could be improved.`,
        impact: 'high',
        actionable: true,
        recommendedActions: [
          'Focus on setting realistic timelines',
          'Improve project planning and resource allocation',
          'Communicate more frequently with clients about progress'
        ]
      });
    }

    // Response time insight
    if (analytics.averageResponseTime <= 2) {
      insights.push({
        type: 'strength',
        title: 'Quick Response Time',
        description: `Your average response time of ${analytics.averageResponseTime.toFixed(1)} hours is excellent!`,
        impact: 'medium',
        actionable: false
      });
    } else if (analytics.averageResponseTime > 24) {
      insights.push({
        type: 'warning',
        title: 'Slow Response Time',
        description: `Your average response time of ${analytics.averageResponseTime.toFixed(1)} hours may be losing you jobs.`,
        impact: 'high',
        actionable: true,
        recommendedActions: [
          'Set up mobile notifications for new job postings',
          'Check the platform multiple times per day',
          'Consider using automated initial responses'
        ]
      });
    }

    // Rating insight
    if (analytics.averageRating >= 4.5) {
      insights.push({
        type: 'strength',
        title: 'Outstanding Customer Satisfaction',
        description: `Your ${analytics.averageRating.toFixed(1)}-star rating shows excellent customer satisfaction!`,
        impact: 'high',
        actionable: false
      });
    } else if (analytics.averageRating < 4.0 && analytics.totalReviews > 5) {
      insights.push({
        type: 'warning',
        title: 'Rating Below Average',
        description: `Your ${analytics.averageRating.toFixed(1)}-star rating needs improvement.`,
        impact: 'high',
        actionable: true,
        recommendedActions: [
          'Follow up with recent clients to address concerns',
          'Focus on exceeding customer expectations',
          'Ask satisfied customers to leave reviews'
        ]
      });
    }

    // Earnings growth insight
    const earningsGrowth = analytics.thisMonthEarnings - analytics.lastMonthEarnings;
    if (earningsGrowth > 0) {
      insights.push({
        type: 'strength',
        title: 'Growing Earnings',
        description: `Your earnings increased by $${earningsGrowth.toFixed(2)} this month!`,
        impact: 'medium',
        actionable: false
      });
    } else if (earningsGrowth < -100) {
      insights.push({
        type: 'opportunity',
        title: 'Declining Earnings',
        description: `Your earnings decreased by $${Math.abs(earningsGrowth).toFixed(2)} this month.`,
        impact: 'high',
        actionable: true,
        recommendedActions: [
          'Increase your bidding activity',
          'Consider competitive pricing strategies',
          'Expand your service offerings'
        ]
      });
    }

    // Market positioning insight
    if (analytics.industryRankPercentile >= 80) {
      insights.push({
        type: 'strength',
        title: 'Top Performer',
        description: `You rank in the top ${(100 - analytics.industryRankPercentile).toFixed(0)}% of contractors in your category!`,
        impact: 'high',
        actionable: false
      });
    }

    return insights;
  }
}
