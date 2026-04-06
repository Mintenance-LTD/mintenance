/**
 * Contractor data for profile editing
 */
export interface ContractorData {
  id: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  city?: string;
  country?: string;
  phone?: string;
  company_name?: string;
  license_number?: string;
  is_available?: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  profile_image_url?: string;
  selected_skills?: string[];
}

/**
 * Data submitted when saving the profile
 */
export interface ProfileSaveData {
  firstName: string;
  lastName: string;
  bio: string;
  city: string;
  country: string;
  phone: string;
  companyName: string;
  licenseNumber: string;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  profileImage?: File | null;
  profileImageUrl?: string;
  selectedSkills?: string[];
  skills?: Array<{ skill_name: string; skill_icon: string }>;
}

export interface EditProfileFormData {
  firstName: string;
  lastName: string;
  bio: string;
  city: string;
  country: string;
  phone: string;
  companyName: string;
  licenseNumber: string;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
}
