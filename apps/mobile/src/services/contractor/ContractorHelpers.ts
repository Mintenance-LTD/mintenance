import { ContractorProfile } from '@mintenance/types';
import type { DatabaseContractorProfileRow, DatabaseUserRow } from './types';

/** Haversine distance between two lat/lon points (km). */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/** Map a profiles row (users table) to a ContractorProfile. */
export function mapUserToContractorProfile(user: DatabaseUserRow): ContractorProfile {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    created_at: user.created_at,
    updated_at: user.updated_at,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    createdAt: user.created_at,
    latitude: user.latitude,
    longitude: user.longitude,
    profile_image_url: user.profile_image_url,
    bio: user.bio,
    rating: user.rating || 0,
    total_jobs_completed: user.total_jobs_completed || 0,
    is_available: user.is_available,
    skills: user.contractor_skills?.map((skill) => ({
      id: skill.id,
      contractorId: user.id,
      skillName: skill.skill_name,
      createdAt: skill.created_at,
    })) || [],
    reviews: user.reviews?.map((review) => ({
      id: review.id,
      jobId: '',
      reviewerId: '',
      reviewedId: user.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    })) || [],
  };
}

/** Map a contractor_profiles row to a ContractorProfile. */
export function mapDatabaseToContractorProfile(data: DatabaseContractorProfileRow): ContractorProfile {
  return {
    id: data.user_id,
    email: data.user?.email || '',
    first_name: data.user?.first_name || '',
    last_name: data.user?.last_name || '',
    role: 'contractor',
    created_at: data.created_at,
    updated_at: data.updated_at,
    firstName: data.user?.first_name,
    lastName: data.user?.last_name,
    bio: data.bio,
    companyName: data.company_name,
    companyLogo: data.company_logo,
    hourlyRate: data.hourly_rate,
    hourly_rate: data.hourly_rate,
    yearsExperience: data.years_experience,
    years_experience: data.years_experience,
    serviceRadius: data.service_radius,
    availability: data.availability,
    portfolioImages: data.portfolio_images || [],
    specialties: data.specialties || [],
    certifications: data.certifications || [],
    licenseNumber: data.license_number,
    license_number: data.license_number,
    latitude: data.latitude,
    longitude: data.longitude,
    skills: [],
    reviews: [],
  };
}
