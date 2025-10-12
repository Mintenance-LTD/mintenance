import { supabase } from '@/lib/supabase';
import type { ContractorMatch, ContractorProfile, ContractorSkill, LocationData, Review } from '@mintenance/types';
import { logger } from '@/lib/logger';

type ContractorSkillRow = {
  id: string;
  contractor_id: string;
  skill_name: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type ContractorRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  updated_at: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  total_jobs_completed?: number | null;
  company_name?: string | null;
  company_logo?: string | null;
  business_address?: string | null;
  license_number?: string | null;
  years_experience?: number | null;
  hourly_rate?: number | null;
  portfolio_images?: string[] | null;
  specialties?: string[] | null;
  service_radius?: number | null;
  availability?: string | null;
  certifications?: string[] | null;
  profile_image_url?: string | null;
  contractor_skills?: ContractorSkillRow[] | null;
  reviews?: ReviewRow[] | null;
};

export class ContractorService {
  static async getNearbyContractors(
    homeownerLocation: LocationData,
    radiusKm: number = 25
  ): Promise<ContractorProfile[]> {
    try {
      const { data: contractors, error } = await supabase
        .from('users')
        .select(`
          *,
          contractor_skills (
            id,
            contractor_id,
            skill_name,
            created_at
          ),
          reviews:reviews!reviewed_id (
            id,
            job_id,
            reviewer_id,
            reviewed_id,
            rating,
            comment,
            created_at
          )
        `)
        .eq('role', 'contractor')
        .limit(50)
        .returns<ContractorRow[]>();

      if (error) {
        logger.error('Error fetching contractors', error);
        return this.getMockContractors();
      }

      const contractorRows = contractors ?? [];
      const profiles = contractorRows.map(contractor => ({
        profile: this.mapContractorFromDb(contractor, homeownerLocation),
        hasGeo: contractor.latitude != null && contractor.longitude != null
      }));

      return profiles
        .filter(({ profile, hasGeo }) => {
          if (!hasGeo) {
            return true;
          }
          const { distance } = profile;
          return distance === undefined || distance <= radiusKm;
        })
        .map(({ profile }) => profile);
    } catch (error) {
      logger.error('Contractor service error', error);
      return this.getMockContractors();
    }
  }

  static async getAllContractors(): Promise<ContractorProfile[]> {
    try {
      const { data: contractors, error } = await supabase
        .from('users')
        .select(`
          *,
          contractor_skills (
            id,
            contractor_id,
            skill_name,
            created_at
          ),
          reviews:reviews!reviewed_id (
            id,
            job_id,
            reviewer_id,
            reviewed_id,
            rating,
            comment,
            created_at
          )
        `)
        .eq('role', 'contractor')
        .limit(100)
        .returns<ContractorRow[]>();

      if (error) {
        logger.error('Error fetching contractors', error);
        return this.getMockContractors();
      }

      const contractorRows = contractors ?? [];
      return contractorRows.map(contractor => this.mapContractorFromDb(contractor));
    } catch (error) {
      logger.error('Contractor service error', error);
      return this.getMockContractors();
    }
  }

  private static mapContractorFromDb(
    contractor: ContractorRow,
    homeownerLocation?: LocationData
  ): ContractorProfile {
    const skills: ContractorSkill[] = (contractor.contractor_skills ?? []).map(skill => ({
      id: skill.id,
      contractorId: skill.contractor_id,
      skillName: skill.skill_name,
      createdAt: skill.created_at
    }));

    const reviews: Review[] = (contractor.reviews ?? []).map(review => ({
      id: review.id,
      jobId: review.job_id,
      reviewerId: review.reviewer_id,
      reviewedId: review.reviewed_id,
      rating: review.rating,
      comment: review.comment ?? '',
      createdAt: review.created_at
    }));

    const availability = this.toAvailability(contractor.availability);
    const hasGeo = contractor.latitude != null && contractor.longitude != null;

    let distance: number | undefined;
    if (homeownerLocation && hasGeo) {
      distance = this.calculateDistance(homeownerLocation, {
        latitude: contractor.latitude as number,
        longitude: contractor.longitude as number
      });
    }

    const profile: ContractorProfile = {
      id: contractor.id,
      email: contractor.email,
      first_name: contractor.first_name,
      last_name: contractor.last_name,
      role: contractor.role as ContractorProfile['role'],
      created_at: contractor.created_at,
      updated_at: contractor.updated_at,
      phone: contractor.phone ?? undefined,
      skills,
      reviews,
      distance,
      rating: contractor.rating ?? undefined,
      companyName: contractor.company_name ?? undefined,
      companyLogo: contractor.company_logo ?? undefined,
      businessAddress: contractor.business_address ?? undefined,
      licenseNumber: contractor.license_number ?? undefined,
      yearsExperience: contractor.years_experience ?? undefined,
      hourlyRate: contractor.hourly_rate ?? undefined,
      portfolioImages: contractor.portfolio_images ?? undefined,
      specialties: contractor.specialties ?? undefined,
      serviceRadius: contractor.service_radius ?? undefined,
      availability,
      certifications: contractor.certifications ?? undefined,
      profileImageUrl: contractor.profile_image_url ?? undefined,
      totalJobsCompleted: contractor.total_jobs_completed ?? undefined
    };

    profile.firstName = contractor.first_name;
    profile.lastName = contractor.last_name;
    profile.createdAt = contractor.created_at;

    return profile;
  }

  private static toAvailability(value: string | null | undefined): ContractorProfile['availability'] | undefined {
    if (!value) {
      return undefined;
    }

    if (value === 'immediate' || value === 'this_week' || value === 'this_month' || value === 'busy') {
      return value;
    }

    return undefined;
  }

  static async recordMatch(
    homeownerId: string,
    contractorId: string,
    action: 'like' | 'pass'
  ): Promise<ContractorMatch | null> {
    try {
      const { data, error } = await supabase
        .from('contractor_matches')
        .insert({
          homeowner_id: homeownerId,
          contractor_id: contractorId,
          action,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error recording match', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Match recording error', error);
      return null;
    }
  }

  private static calculateDistance(
    location1: LocationData,
    location2: LocationData
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(location2.latitude - location1.latitude);
    const dLon = this.toRadians(location2.longitude - location1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(location1.latitude)) *
        Math.cos(this.toRadians(location2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private static getMockContractors(): ContractorProfile[] {
    return [
      {
        id: 'contractor1',
        email: 'john.plumber@example.com',
        first_name: 'John',
        last_name: 'Smith',
        role: 'contractor',
        created_at: new Date(Date.now() - 86400000 * 180).toISOString(),
        updated_at: new Date().toISOString(),
        phone: '(206) 555-0123',
        profileImageUrl: 'https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=JS',
        rating: 4.8,
        totalJobsCompleted: 127,
        companyName: 'Smith Plumbing Pro',
        yearsExperience: 8,
        hourlyRate: 85,
        serviceRadius: 30,
        availability: 'this_week',
        specialties: ['Emergency Repairs', 'Pipe Installation', 'Drain Cleaning'],
        certifications: ['Licensed Plumber', 'Certified Backflow Tester'],
        portfolioImages: [
          'https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=Kitchen+Install',
          'https://via.placeholder.com/300x200/1E40AF/FFFFFF?text=Bathroom+Remodel'
        ],
        skills: [
          { id: 's1', contractorId: 'contractor1', skillName: 'Plumbing', createdAt: new Date().toISOString() },
          { id: 's2', contractorId: 'contractor1', skillName: 'Pipe Repair', createdAt: new Date().toISOString() }
        ],
        reviews: [
          {
            id: 'r1', jobId: 'j1', reviewerId: 'h1', reviewedId: 'contractor1',
            rating: 5, comment: 'Excellent work, very professional', createdAt: new Date().toISOString()
          }
        ],
        distance: 2.3
      },
      {
        id: 'contractor2',
        email: 'sarah.electrician@example.com',
        first_name: 'Sarah',
        last_name: 'Johnson',
        role: 'contractor',
        created_at: new Date(Date.now() - 86400000 * 365).toISOString(),
        updated_at: new Date().toISOString(),
        phone: '(206) 555-0456',
        profileImageUrl: 'https://via.placeholder.com/150x150/F59E0B/FFFFFF?text=SJ',
        rating: 4.9,
        totalJobsCompleted: 203,
        companyName: 'Johnson Electric Solutions',
        yearsExperience: 12,
        hourlyRate: 95,
        serviceRadius: 25,
        availability: 'immediate',
        specialties: ['Smart Home Installation', 'Panel Upgrades', 'Troubleshooting'],
        certifications: ['Master Electrician', 'Smart Home Certified'],
        portfolioImages: [
          'https://via.placeholder.com/300x200/F59E0B/FFFFFF?text=Panel+Upgrade',
          'https://via.placeholder.com/300x200/D97706/FFFFFF?text=Smart+Home'
        ],
        skills: [
          { id: 's3', contractorId: 'contractor2', skillName: 'Electrical', createdAt: new Date().toISOString() },
          { id: 's4', contractorId: 'contractor2', skillName: 'Smart Home', createdAt: new Date().toISOString() }
        ],
        reviews: [
          {
            id: 'r2', jobId: 'j2', reviewerId: 'h2', reviewedId: 'contractor2',
            rating: 5, comment: 'Outstanding electrical work', createdAt: new Date().toISOString()
          }
        ],
        distance: 4.1
      },
      {
        id: 'contractor3',
        email: 'mike.hvac@example.com',
        first_name: 'Mike',
        last_name: 'Wilson',
        role: 'contractor',
        created_at: new Date(Date.now() - 86400000 * 450).toISOString(),
        updated_at: new Date().toISOString(),
        phone: '(206) 555-0789',
        profileImageUrl: 'https://via.placeholder.com/150x150/10B981/FFFFFF?text=MW',
        rating: 4.7,
        totalJobsCompleted: 89,
        companyName: 'Wilson HVAC Services',
        yearsExperience: 6,
        hourlyRate: 75,
        serviceRadius: 35,
        availability: 'this_month',
        specialties: ['System Installation', 'Maintenance', 'Energy Efficiency'],
        certifications: ['HVAC Certified', 'EPA 608 Certified'],
        portfolioImages: [
          'https://via.placeholder.com/300x200/10B981/FFFFFF?text=HVAC+Install',
          'https://via.placeholder.com/300x200/059669/FFFFFF?text=Duct+Work'
        ],
        skills: [
          { id: 's5', contractorId: 'contractor3', skillName: 'HVAC', createdAt: new Date().toISOString() },
          { id: 's6', contractorId: 'contractor3', skillName: 'Air Conditioning', createdAt: new Date().toISOString() }
        ],
        reviews: [
          {
            id: 'r3', jobId: 'j3', reviewerId: 'h3', reviewedId: 'contractor3',
            rating: 5, comment: 'Great HVAC service', createdAt: new Date().toISOString()
          }
        ],
        distance: 7.8
      },
      {
        id: 'contractor4',
        email: 'amy.handywoman@example.com',
        first_name: 'Amy',
        last_name: 'Chen',
        role: 'contractor',
        created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
        updated_at: new Date().toISOString(),
        phone: '(206) 555-0321',
        profileImageUrl: 'https://via.placeholder.com/150x150/8B5CF6/FFFFFF?text=AC',
        rating: 4.6,
        totalJobsCompleted: 156,
        companyName: 'Chen Home Repairs',
        yearsExperience: 5,
        hourlyRate: 65,
        serviceRadius: 20,
        availability: 'this_week',
        specialties: ['General Repairs', 'Furniture Assembly', 'Minor Electrical'],
        certifications: ['General Contractor', 'Insured & Bonded'],
        portfolioImages: [
          'https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=Home+Repair',
          'https://via.placeholder.com/300x200/7C3AED/FFFFFF?text=Assembly'
        ],
        skills: [
          { id: 's7', contractorId: 'contractor4', skillName: 'Handyman', createdAt: new Date().toISOString() },
          { id: 's8', contractorId: 'contractor4', skillName: 'Assembly', createdAt: new Date().toISOString() }
        ],
        reviews: [
          {
            id: 'r4', jobId: 'j4', reviewerId: 'h4', reviewedId: 'contractor4',
            rating: 4, comment: 'Good work, reasonable prices', createdAt: new Date().toISOString()
          }
        ],
        distance: 1.9
      }
    ];
  }
}

