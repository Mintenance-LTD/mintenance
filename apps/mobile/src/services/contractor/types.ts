export interface DatabaseError {
  code?: string;
  message?: string;
}

export interface DatabaseContractorProfileRow {
  id: string;
  user_id: string;
  company_name?: string;
  company_logo?: string;
  bio?: string;
  business_address?: string;
  hourly_rate?: number;
  years_experience?: number;
  service_radius?: number;
  availability?: 'immediate' | 'this_week' | 'this_month' | 'busy';
  portfolio_images?: string[];
  specialties?: string[];
  certifications?: string[];
  license_number?: string;
  insurance_provider?: string;
  insurance_policy?: string;
  insurance_expiry?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  user?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface DatabaseUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
  profile_image_url?: string;
  bio?: string;
  rating?: number;
  total_jobs_completed?: number;
  is_available?: boolean;
  contractor_skills?: DatabaseSkillRow[];
  reviews?: DatabaseReviewRow[];
}

export interface DatabaseSkillRow {
  id: string;
  contractor_id: string;
  skill_name: string;
  created_at: string;
}

export interface DatabaseReviewRow {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface DatabaseMatchRow {
  id: string;
  homeowner_id: string;
  contractor_id: string;
  action: string;
  created_at: string;
  contractor?: DatabaseUserRow;
}
