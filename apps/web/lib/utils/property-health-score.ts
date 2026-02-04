import type { PropertyHealthScore } from '@mintenance/shared';

interface PropertyHealthMetrics {
  completedJobs: number;
  activeJobs: number;
  lastServiceDate: string | null;
  totalSpent: number;
  propertyAge?: number; // Years since property was built
  recentCategories?: string[];
}

/**
 * Calculate property health score based on maintenance history
 * Returns a score from 0-100 with grade and recommendations
 */
export function calculatePropertyHealthScore(
  metrics: PropertyHealthMetrics
): PropertyHealthScore {
  let score = 0;
  const recommendations: string[] = [];

  // Factor 1: Maintenance frequency (0-30 points)
  // More completed jobs = better maintained property
  const maintenanceFrequencyScore = Math.min(metrics.completedJobs * 3, 30);
  score += maintenanceFrequencyScore;

  if (metrics.completedJobs === 0) {
    recommendations.push('Schedule your first maintenance job to start tracking property health');
  } else if (metrics.completedJobs < 5) {
    recommendations.push('Increase regular maintenance frequency for better property health');
  }

  // Factor 2: Recent activity (0-25 points)
  // Properties with recent maintenance score higher
  if (metrics.lastServiceDate) {
    const daysSinceService = Math.floor(
      (Date.now() - new Date(metrics.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceService <= 30) {
      score += 25; // Excellent - serviced within a month
    } else if (daysSinceService <= 90) {
      score += 20; // Good - serviced within 3 months
      recommendations.push('Consider scheduling routine maintenance check');
    } else if (daysSinceService <= 180) {
      score += 15; // Fair - serviced within 6 months
      recommendations.push('It has been a while since last service - schedule a property inspection');
    } else if (daysSinceService <= 365) {
      score += 10; // Concerning - serviced within a year
      recommendations.push('Schedule a comprehensive property inspection soon');
    } else {
      score += 5; // Critical - over a year since service
      recommendations.push('URGENT: No maintenance in over a year - schedule immediate inspection');
    }
  } else {
    recommendations.push('No maintenance history - start with a comprehensive property inspection');
  }

  // Factor 3: Active issues management (0-20 points)
  // Fewer active jobs = better managed property
  if (metrics.activeJobs === 0) {
    score += 20; // No pending issues
  } else if (metrics.activeJobs <= 2) {
    score += 15; // Manageable number of active jobs
  } else if (metrics.activeJobs <= 5) {
    score += 10; // Several active jobs
    recommendations.push('Multiple active jobs - ensure timely completion to prevent compound issues');
  } else {
    score += 5; // Many active jobs
    recommendations.push('High number of active jobs - prioritize critical repairs');
  }

  // Factor 4: Investment in maintenance (0-15 points)
  // Regular investment shows proactive maintenance
  const averageSpendPerJob = metrics.completedJobs > 0
    ? metrics.totalSpent / metrics.completedJobs
    : 0;

  if (averageSpendPerJob >= 500) {
    score += 15; // Good investment in quality maintenance
  } else if (averageSpendPerJob >= 200) {
    score += 10; // Reasonable maintenance spending
  } else if (averageSpendPerJob > 0) {
    score += 5; // Minimal spending
    recommendations.push('Consider budgeting more for preventative maintenance to avoid costly repairs');
  }

  // Factor 5: Diversity of maintenance (0-10 points)
  // Maintaining different areas shows comprehensive care
  const uniqueCategories = metrics.recentCategories?.length || 0;
  if (uniqueCategories >= 4) {
    score += 10; // Comprehensive maintenance
  } else if (uniqueCategories >= 2) {
    score += 7; // Good coverage
  } else if (uniqueCategories === 1) {
    score += 4; // Single area focus
    recommendations.push('Expand maintenance to cover other property areas');
  }

  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine grade and color
  let grade: PropertyHealthScore['grade'];
  let color: string;

  if (score >= 80) {
    grade = 'excellent';
    color = '#10b981'; // green-500
    if (recommendations.length === 0) {
      recommendations.push('Excellent maintenance record - keep up the great work!');
    }
  } else if (score >= 60) {
    grade = 'good';
    color = '#3b82f6'; // blue-500
    if (recommendations.length === 0) {
      recommendations.push('Good maintenance habits - stay proactive with regular checks');
    }
  } else if (score >= 40) {
    grade = 'needs_attention';
    color = '#f59e0b'; // amber-500
    recommendations.push('Property needs more regular attention to prevent issues');
  } else {
    grade = 'critical';
    color = '#ef4444'; // red-500
    recommendations.push('CRITICAL: Property requires immediate attention to prevent deterioration');
  }

  return {
    score,
    grade,
    color,
    recommendations,
  };
}

/**
 * Get display text for health grade
 */
export function getHealthGradeLabel(grade: PropertyHealthScore['grade']): string {
  const labels = {
    excellent: 'Excellent',
    good: 'Good',
    needs_attention: 'Needs Attention',
    critical: 'Critical',
  };
  return labels[grade];
}

/**
 * Get icon name for health grade (for lucide-react icons)
 */
export function getHealthGradeIcon(grade: PropertyHealthScore['grade']): string {
  const icons = {
    excellent: 'CheckCircle2',
    good: 'ThumbsUp',
    needs_attention: 'AlertTriangle',
    critical: 'AlertOctagon',
  };
  return icons[grade];
}
