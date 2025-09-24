import { supabase } from '@/lib/supabase';
import type { ContractorProfile, LocationData, ContractorMatch } from '@mintenance/types';

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
            skill_name,
            created_at
          ),
          reviews:reviews!reviewed_id (
            id,
            rating,
            comment,
            created_at
          )
        `)
        .eq('role', 'contractor')
        .limit(50);

      if (error) {
        console.error('Error fetching contractors:', error);
        return this.getMockContractors();
      }

      return contractors?.map(contractor => ({
        ...contractor,
        skills: contractor.contractor_skills || [],
        reviews: contractor.reviews || [],
        distance: this.calculateDistance(homeownerLocation, {
          latitude: contractor.latitude || 47.6062,
          longitude: contractor.longitude || -122.3321
        })
      })) || [];
    } catch (error) {
      console.error('Contractor service error:', error);
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
            skill_name,
            created_at
          ),
          reviews:reviews!reviewed_id (
            id,
            rating,
            comment,
            created_at
          )
        `)
        .eq('role', 'contractor')
        .limit(100);

      if (error) {
        console.error('Error fetching contractors:', error);
        return this.getMockContractors();
      }

      return contractors?.map(contractor => ({
        ...contractor,
        skills: contractor.contractor_skills || [],
        reviews: contractor.reviews || []
      })) || [];
    } catch (error) {
      console.error('Contractor service error:', error);
      return this.getMockContractors();
    }
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
        console.error('Error recording match:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Match recording error:', error);
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