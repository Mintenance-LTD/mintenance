/**
 * Job and bid standardized types
 */

import type { User } from './user';

// =============================================
// JOB MANAGEMENT TYPES
// =============================================

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  homeownerId: string;
  contractorId?: string;
  status: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget: number;
  createdAt: string;
  updatedAt: string;
  // Additional fields
  category?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
  photos?: string[];
  // Relationships
  bids?: Bid[];
  homeowner?: User;
  contractor?: User;
}

export interface Bid {
  id: string;
  jobId: string;
  contractorId: string;
  amount: number;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  // Computed fields
  contractorName?: string;
  contractorEmail?: string;
  contractorRating?: number;
  jobTitle?: string;
  jobDescription?: string;
  jobLocation?: string;
  jobBudget?: number;
  // Relationships
  contractor?: User;
  job?: Job;
}

// Database field mapping type
export type DatabaseJob = {
  id: string;
  title: string;
  description: string;
  location: string;
  homeowner_id: string;
  contractor_id?: string;
  status: Job['status'];
  budget: number;
  created_at: string;
  updated_at: string;
  category?: string;
  subcategory?: string;
  priority?: Job['priority'];
  photos?: string[];
};

// Re-exports for backward compatibility
