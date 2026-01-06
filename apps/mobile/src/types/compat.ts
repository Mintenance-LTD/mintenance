// Compatibility exports for gradual migration
// Re-export from @mintenance/types but add mobile-specific additions

export {
  User,
  Job,
  CreateUserData,
  AuthResult,
  LoginCredentials,
  RegisterData,
  ApiResponse,
  RateLimitInfo,
  JWTPayload
} from '@mintenance/types';

// Mobile-specific type additions (temporary until fully migrated)
export interface UserProfile extends User {
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
