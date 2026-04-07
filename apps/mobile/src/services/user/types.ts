import { User } from '@mintenance/types';

export interface DatabaseJobRow {
  id: string;
  status: string;
  budget: number;
  created_at: string;
  updated_at: string;
  homeowner_id: string;
  contractor_id?: string;
  title?: string;
  location?: string;
}
export interface DatabaseReviewRow {
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: {
    first_name?: string;
    last_name?: string;
  };
}
export interface DatabaseUserRow {
  id: string;
  email?: string; // not selected on cross-user reads (PII protection)
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  phone?: string; // not selected on cross-user reads (PII protection)
  bio?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  contractor_skills?: DatabaseSkillRow[];
}
export interface DatabaseSkillRow {
  skill_name: string;
}
export interface DatabaseTodaysJobRow {
  id: string;
  title: string;
  location: string;
  scheduled_start_date: string;
  homeowner?: {
    first_name?: string;
    last_name?: string;
  };
}
export interface DatabaseContractorRow {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_image_url?: string;
  phone?: string;
  contractor_skills?: DatabaseSkillRow[];
}
export interface ScheduledJob {
  time: string;
  client: string;
  location: string;
  type: string;
  jobId: string;
}
export interface ContractorStats {
  activeJobs: number;
  monthlyEarnings: number;
  rating: number;
  completedJobs: number;
  totalJobs: number;
  totalJobsCompleted: number;
  responseTime: string;
  successRate: number;
  todaysAppointments: number;
  nextAppointment?: ScheduledJob;
  todaysJobs: ScheduledJob[];
}
export interface UserProfile extends User {
  skills?: { skillName: string }[];
  reviews?: {
    rating: number;
    comment: string;
    reviewer: string;
    createdAt: string;
  }[];
  distance?: number;
}
