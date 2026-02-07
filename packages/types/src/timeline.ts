import type { Job } from './jobs';
import type { User } from './user';

// Project Timeline & Milestone Types
export interface ProjectTimeline {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  startDate: string;
  estimatedEndDate: string;
  actualEndDate?: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  progress: number; // 0-100 percentage
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  job?: Job;
  milestones?: ProjectMilestone[];
  totalMilestones?: number;
  completedMilestones?: number;
}

export interface ProjectMilestone {
  id: string;
  timelineId: string;
  jobId: string;
  title: string;
  description?: string;
  targetDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'task' | 'checkpoint' | 'payment' | 'inspection' | 'delivery';
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  paymentAmount?: number;
  dependencies?: string[]; // Array of milestone IDs that must be completed first
  attachments?: MilestoneAttachment[];
  notes?: MilestoneNote[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  assignee?: User;
  dependsOn?: ProjectMilestone[];
  blocking?: ProjectMilestone[];
}

export interface MilestoneAttachment {
  id: string;
  milestoneId: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
}

export interface MilestoneNote {
  id: string;
  milestoneId: string;
  content: string;
  type: 'note' | 'update' | 'issue' | 'resolution';
  visibility: 'public' | 'contractor_only' | 'homeowner_only';
  authorId: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  author?: User;
}

export interface ProjectProgress {
  timelineId: string;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  upcomingMilestones: number;
  progressPercentage: number;
  estimatedCompletion: string;
  isOnTrack: boolean;
  daysRemaining?: number;
  daysOverdue?: number;
}

export interface TimelineTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: number; // in days
  milestoneTemplates: MilestoneTemplate[];
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneTemplate {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  type: ProjectMilestone['type'];
  priority: ProjectMilestone['priority'];
  dayOffset: number; // Days from project start
  estimatedHours?: number;
  paymentPercentage?: number; // Percentage of total job budget
  dependencies?: number[]; // Array of milestone template indices
  isRequired: boolean;
  order: number;
}

export interface ProjectAnalytics {
  timelineId: string;
  totalDuration: number; // actual days taken
  estimatedVsActualTime: {
    estimated: number;
    actual: number;
    variance: number;
  };
  milestonePerformance: {
    onTime: number;
    late: number;
    early: number;
    cancelled: number;
  };
  budgetTracking: {
    totalBudget: number;
    spentAmount: number;
    remainingAmount: number;
    milestonePayments: number;
    pendingPayments: number;
  };
  bottlenecks: ProjectBottleneck[];
  recommendations: string[];
}

export interface ProjectBottleneck {
  milestoneId: string;
  milestoneName: string;
  delayDays: number;
  impact: 'low' | 'medium' | 'high';
  reason: string;
  suggestedAction: string;
}
