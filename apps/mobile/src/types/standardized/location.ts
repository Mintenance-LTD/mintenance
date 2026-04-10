/**
 * Location and meeting standardized types
 */

import type { User } from './user';
import type { Job } from './jobs';

// =============================================
// LOCATION AND MEETING
// =============================================

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Meeting {
  id: string;
  jobId: string;
  homeownerId: string;
  contractorId: string;
  scheduledDateTime: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  meetingType: 'site_visit' | 'consultation' | 'work_session';
  location?: LocationData;
  duration?: number; // in minutes
  notes?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  createdAt: string;
  updatedAt: string;
  // Relationships
  job?: Job;
  homeowner?: User;
  contractor?: User;
}
