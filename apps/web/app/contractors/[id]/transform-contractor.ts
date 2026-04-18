/**
 * Transform the `/api/contractors/[id]` JSON payload into the in-memory
 * Contractor shape the page components consume.
 *
 * Extracted from page.tsx to keep that file under the 500-line pre-commit
 * limit after R7 #9 + #11 added postcode-proof + dispute-history fields.
 */

export interface RawContractorData {
  id: string;
  name?: string;
  company_name?: string;
  city?: string;
  country?: string;
  created_at?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  total_jobs_completed?: number;
  skills?: string[];
  bio?: string;
  phone?: string;
  email?: string;
  verified?: boolean;
  postcode_prefix?: string | null;
  postcode_proof_count?: number | null;
  dispute_history?: {
    resolved_count: number;
    unresolved_count: number;
    avg_resolution_hours: number | null;
  };
}

export interface Contractor {
  id: string;
  name: string;
  company: string;
  avatar: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  yearsExperience: number;
  responseTime: string;
  acceptanceRate: number;
  location: string;
  serviceArea: string[];
  specialties: string[];
  description: string;
  phone: string;
  email: string;
  website?: string;
  verified: boolean;
  premium: boolean;
  joinDate: string;
  stats: {
    onTimeCompletion: number;
    repeatCustomers: number;
    avgProjectValue: number;
  };
  postcodePrefix?: string | null;
  postcodeProofCount?: number | null;
  disputeHistory?: {
    resolvedCount: number;
    unresolvedCount: number;
    avgResolutionHours: number | null;
  };
}

export function transformContractorData(
  c: RawContractorData,
  id: string
): Contractor {
  const location =
    c.city && c.country
      ? `${c.city}, ${c.country}`
      : c.city || c.country || 'Location not specified';
  const joinDate = c.created_at ? new Date(c.created_at) : new Date();
  const now = new Date();
  const yearsExperience =
    joinDate <= now
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
          )
        )
      : 0;
  const bioOk =
    c.bio &&
    !c.bio.toLowerCase().includes('blalal') &&
    !c.bio.toLowerCase().includes('lorem') &&
    c.bio.trim().length > 10;
  return {
    id: c.id,
    name: c.name || 'Contractor',
    company: c.company_name || 'Independent Contractor',
    avatar:
      c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    coverImage: '/images/contractor-cover.jpg',
    rating: c.rating || 0,
    reviewCount: c.reviewCount || 0,
    completedJobs: c.total_jobs_completed || 0,
    yearsExperience,
    responseTime: '< 24 hours',
    acceptanceRate: 0,
    location,
    serviceArea: [],
    specialties: c.skills || [],
    description: bioOk ? (c.bio as string) : 'No description available.',
    phone: c.phone || '',
    email: c.email || '',
    website: undefined,
    verified: c.verified || false,
    premium: false,
    joinDate: c.created_at || new Date().toISOString(),
    stats: { onTimeCompletion: 0, repeatCustomers: 0, avgProjectValue: 0 },
    postcodePrefix: c.postcode_prefix ?? null,
    postcodeProofCount: c.postcode_proof_count ?? null,
    disputeHistory: c.dispute_history
      ? {
          resolvedCount: c.dispute_history.resolved_count,
          unresolvedCount: c.dispute_history.unresolved_count,
          avgResolutionHours: c.dispute_history.avg_resolution_hours,
        }
      : undefined,
  };
}
