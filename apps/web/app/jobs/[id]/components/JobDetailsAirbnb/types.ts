/**
 * JobDetailsAirbnb - Shared Types
 */

export interface JobDetailsAirbnbJob {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  budget: number;
  location: string;
  createdAt: string;
  updatedAt?: string;
  priority?: string;
  estimatedDuration?: string;
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
}

export interface JobDetailsAirbnbHomeowner {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  jobsPosted?: number;
  memberSince?: string;
}

export interface JobDetailsAirbnbProperty {
  id: string;
  name: string;
  address: string;
  propertyType?: string;
}

export interface JobDetailsAirbnbContractor {
  id: string;
  name: string;
  companyName?: string;
  avatar?: string;
  rating?: number;
  completedJobs?: number;
  isVerified?: boolean;
}

export interface JobDetailsAirbnbBid {
  id: string;
  amount: number;
  status: string;
  contractorName: string;
  contractorAvatar?: string;
  contractorRating?: number;
}

export interface JobDetailsAirbnbProps {
  job: JobDetailsAirbnbJob;
  images: string[];
  homeowner: JobDetailsAirbnbHomeowner;
  property?: JobDetailsAirbnbProperty | null;
  contractor?: JobDetailsAirbnbContractor | null;
  bids?: JobDetailsAirbnbBid[];
  userRole: 'homeowner' | 'contractor';
  isOwner: boolean;
  onEdit?: () => void;
  onComplete?: () => void;
  onContact?: () => void;
}

/* ==========================================
   HELPERS
   ========================================== */

export const getStatusBadgeVariant = (status: string) => {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    posted: 'info',
    assigned: 'warning',
    in_progress: 'warning',
    review: 'info',
    completed: 'success',
    cancelled: 'neutral',
  };
  return variants[status] || 'neutral';
};

export const getPriorityColor = (priority?: string) => {
  const colors: Record<string, string> = {
    low: 'text-blue-600 bg-blue-50',
    medium: 'text-amber-600 bg-amber-50',
    high: 'text-orange-600 bg-orange-50',
    emergency: 'text-red-600 bg-red-50',
  };
  return priority ? colors[priority] || 'text-gray-600 bg-gray-50' : 'text-gray-600 bg-gray-50';
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};
