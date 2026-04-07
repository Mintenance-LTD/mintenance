import type { ContractorAnalytics, PerformanceInsight } from './types';

export function generatePerformanceInsights(
  analytics: ContractorAnalytics
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  // Completion rate insight
  if (analytics.completionRate >= 90) {
    insights.push({
      type: 'strength',
      title: 'Excellent Completion Rate',
      description: `You have a ${analytics.completionRate.toFixed(1)}% job completion rate, which is outstanding!`,
      impact: 'high',
      actionable: false,
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
        'Communicate more frequently with clients about progress',
      ],
    });
  }

  // Response time insight
  if (analytics.averageResponseTime <= 2) {
    insights.push({
      type: 'strength',
      title: 'Quick Response Time',
      description: `Your average response time of ${analytics.averageResponseTime.toFixed(1)} hours is excellent!`,
      impact: 'medium',
      actionable: false,
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
        'Consider using automated initial responses',
      ],
    });
  }

  // Rating insight
  if (analytics.averageRating >= 4.5) {
    insights.push({
      type: 'strength',
      title: 'Outstanding Customer Satisfaction',
      description: `Your ${analytics.averageRating.toFixed(1)}-star rating shows excellent customer satisfaction!`,
      impact: 'high',
      actionable: false,
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
        'Ask satisfied customers to leave reviews',
      ],
    });
  }

  // Earnings growth insight
  const earningsGrowth =
    analytics.thisMonthEarnings - analytics.lastMonthEarnings;
  if (earningsGrowth > 0) {
    insights.push({
      type: 'strength',
      title: 'Growing Earnings',
      description: `Your earnings increased by $${earningsGrowth.toFixed(2)} this month!`,
      impact: 'medium',
      actionable: false,
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
        'Expand your service offerings',
      ],
    });
  }

  // Market positioning insight
  if (analytics.industryRankPercentile >= 80) {
    insights.push({
      type: 'strength',
      title: 'Top Performer',
      description: `You rank in the top ${(100 - analytics.industryRankPercentile).toFixed(0)}% of contractors in your category!`,
      impact: 'high',
      actionable: false,
    });
  }

  return insights;
}
