// Compatibility exports for gradual migration
// Re-export from @mintenance/types but add mobile-specific additions

export type { User, Job } from '@mintenance/types';

// Mobile-specific type additions (temporary until fully migrated)
import type { User } from '@mintenance/types';

interface UserProfile extends User {
  // Additional mobile-specific fields
  latitude?: number;
  longitude?: number;
  address?: string;
  profileImageUrl?: string;
  isAvailable?: boolean;
  isVerified?: boolean;
  totalJobsCompleted?: number;
}

// Add any other mobile-specific types here temporarily
