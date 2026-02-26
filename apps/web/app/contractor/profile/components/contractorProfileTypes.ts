export interface ContractorProfileData {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  profile_image_url?: string;
  admin_verified?: boolean;
  bio?: string;
  city?: string;
  country?: string;
  phone?: string;
  company_name?: string;
  license_number?: string;
  created_at?: string;
}

export interface ContractorReview {
  id: string;
  rating: number;
  comment: string;
  reviewer_name?: string;
  created_at: string;
  reviewer?: {
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
  job?: {
    id: string;
    title?: string;
  };
}

export interface CompletedJob {
  id: string;
  title: string;
  category: string;
  photos?: Array<{ url: string }>;
}

export interface ContractorPost {
  id: string;
  title: string;
  content?: string;
  images?: Array<{ url: string }>;
  media_urls?: string[];
  help_category?: string;
}

export interface ProfileMetrics {
  profileCompletion: number;
  averageRating: number;
  totalReviews: number;
  jobsCompleted: number;
  winRate: number;
  totalEarnings: number;
  totalBids: number;
}

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  company_name: string;
  bio: string;
}
