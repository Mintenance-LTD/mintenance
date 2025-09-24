/**
 * Goal Management Types
 * 
 * Contains all TypeScript interfaces and types for goal management functionality.
 */

export interface Goal {
  id: string;
  contractorId: string;
  category: 'revenue' | 'clients' | 'projects' | 'efficiency' | 'growth' | 'quality' | 'personal';
  type: 'smart' | 'okr' | 'kpi' | 'milestone';
  title: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeframe: GoalTimeframe;
  metrics: GoalMetrics;
  milestones: Milestone[];
  dependencies: string[];
  assignees: string[];
  tags: string[];
  notes: string[];
  attachments: string[];
  progress: GoalProgress;
  createdAt: string;
  updatedAt: string;
}

export interface GoalTimeframe {
  startDate: string;
  endDate: string;
  duration: number; // in days
  isRecurring: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    interval: number;
    endCondition: 'never' | 'date' | 'count';
    endValue?: string | number;
  };
}

export interface GoalMetrics {
  targetValue: number;
  currentValue: number;
  unit: string;
  measurementMethod: 'manual' | 'automatic' | 'calculated';
  dataSource?: string;
  kpis: KPI[];
  thresholds: {
    green: number;
    yellow: number;
    red: number;
  };
}

export interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  targetDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  value: number;
  weight: number;
  dependencies: string[];
  deliverables: string[];
  criteria: CompletionCriteria[];
  createdAt: string;
}

export interface CompletionCriteria {
  id: string;
  description: string;
  type: 'binary' | 'numeric' | 'percentage';
  target?: number;
  current?: number;
  isCompleted: boolean;
}

export interface GoalProgress {
  percentage: number;
  status: 'behind' | 'on_track' | 'ahead' | 'at_risk';
  lastUpdated: string;
  velocity: number; // progress per day
  estimatedCompletion: string;
  blockers: Blocker[];
  achievements: Achievement[];
  updates: ProgressUpdate[];
}

export interface Blocker {
  id: string;
  title: string;
  description: string;
  type: 'resource' | 'dependency' | 'technical' | 'external' | 'budget';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'mitigated';
  impact: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'milestone' | 'kpi' | 'personal' | 'team';
  value: number;
  impact: 'low' | 'medium' | 'high';
  celebrated: boolean;
  celebratedAt?: string;
  createdAt: string;
}

export interface ProgressUpdate {
  id: string;
  goalId: string;
  userId: string;
  content: string;
  type: 'manual' | 'automatic' | 'milestone' | 'kpi';
  metrics?: Partial<GoalMetrics>;
  attachments: string[];
  createdAt: string;
}

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: Goal['category'];
  type: Goal['type'];
  defaultTimeframe: Partial<GoalTimeframe>;
  defaultMetrics: Partial<GoalMetrics>;
  suggestedMilestones: Partial<Milestone>[];
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  rating: number;
  createdAt: string;
}

export interface GoalAnalytics {
  goalId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    completionRate: number;
    averageVelocity: number;
    timeToComplete: number;
    accuracy: number; // how close to target
  };
  trends: {
    progress: number[];
    velocity: number[];
    kpis: Record<string, number[]>;
  };
  insights: string[];
  recommendations: string[];
  lastCalculated: string;
}

export interface GoalDashboard {
  contractorId: string;
  summary: {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    overdueGoals: number;
    averageProgress: number;
  };
  recentActivity: ProgressUpdate[];
  upcomingMilestones: Milestone[];
  topPerformers: Goal[];
  needsAttention: Goal[];
  lastUpdated: string;
}

export interface GoalFilters {
  category?: Goal['category'][];
  type?: Goal['type'][];
  status?: Goal['status'][];
  priority?: Goal['priority'][];
  tags?: string[];
  assignees?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  progressRange?: {
    min: number;
    max: number;
  };
}

export interface GoalSortOptions {
  field: 'title' | 'status' | 'priority' | 'progress' | 'createdAt' | 'updatedAt' | 'deadline';
  direction: 'asc' | 'desc';
}

export interface CreateGoalRequest {
  contractorId: string;
  category: Goal['category'];
  type: Goal['type'];
  title: string;
  description: string;
  priority: Goal['priority'];
  timeframe: GoalTimeframe;
  metrics: GoalMetrics;
  milestones?: Partial<Milestone>[];
  dependencies?: string[];
  assignees?: string[];
  tags?: string[];
  templateId?: string;
}

export interface UpdateGoalRequest {
  id: string;
  updates: Partial<Pick<Goal, 'title' | 'description' | 'status' | 'priority' | 'timeframe' | 'metrics' | 'tags' | 'assignees'>>;
}

export interface GoalSearchParams {
  query?: string;
  filters?: GoalFilters;
  sort?: GoalSortOptions;
  page?: number;
  limit?: number;
}
