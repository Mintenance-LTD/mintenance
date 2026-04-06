import type { ContractorProfile } from '@mintenance/types';

export interface SearchState {
  service: string;
  location: string;
  date: string;
}

export interface Stats {
  contractors: number;
  jobs: number;
  avgRating: number;
  cities: number;
}

export interface FeaturedContractor extends ContractorProfile {
  image: string;
  category: string;
  full_name?: string;
  jobs_completed?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  image: string;
}
