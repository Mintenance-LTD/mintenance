/**
 * Contractor Map Marker Interface
 */
export interface ContractorMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating: number;
  distance?: number;
  skills: string[];
  profileImage?: string;
  city?: string;
}

export interface ContractorMapData {
  id: string;
  first_name?: string;
  last_name?: string;
  latitude?: string | number;
  longitude?: string | number;
  is_visible_on_map?: boolean;
  rating?: number;
  category?: string;
  profile_image_url?: string;
  city?: string;
  company_name?: string;
  bio?: string;
  email_verified?: boolean;
  total_jobs_completed?: number;
  is_available?: boolean;
  contractor_skills?: Array<{ skill_name: string }>;
  [key: string]: unknown;
}
