import type { MaintenanceRecommendation } from '@/lib/services/RecommendationsService';

export const categoryImages: Record<string, string> = {
  plumbing:
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=800',
  electrical:
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800',
  carpentry:
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800',
  painting:
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=800',
  roofing:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800',
  hvac: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800',
  landscaping:
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=800',
  general:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800',
  default:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800',
};

export interface Property {
  id: string;
  property_name: string | null;
  address: string | null;
  photos?: string[];
  property_type?: string;
}

export interface DashboardWithAirbnbSearchProps {
  data: {
    homeowner: {
      id: string;
      name: string;
      avatar?: string;
      location: string;
      email: string;
    };
    properties: Property[];
    metrics: {
      totalSpent: number;
      activeJobs: number;
      completedJobs: number;
      savedContractors: number;
    };
    activeJobs: Array<{
      id: string;
      title: string;
      status: string;
      budget: number;
      category?: string;
      contractor?: {
        name: string;
        image?: string;
      };
      progress: number;
      bidsCount: number;
      scheduledDate?: string;
      photoUrl?: string | null;
    }>;
    pendingBids?: Array<{
      id: string;
      amount: number;
      jobId: string;
      jobTitle: string;
      contractorName: string;
      contractorImage?: string;
      createdAt: string;
    }>;
    recentActivity: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
    }>;
    upcomingAppointments?: Array<{
      id: string;
      title: string;
      date: string;
      time: string;
      endTime?: string;
      locationType?: string;
      status: string;
      contractor?: { name: string };
    }>;
    recommendations?: MaintenanceRecommendation[];
  };
}

export interface PortfolioAccessState {
  allowed: boolean;
  requiresSubscription: boolean;
  subscriptionStatus: string;
  message?: string | null;
  upgradeUrl?: string;
}
