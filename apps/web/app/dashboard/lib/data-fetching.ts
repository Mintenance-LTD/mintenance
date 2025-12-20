/**
 * Dashboard Data Fetching
 * Centralized data fetching logic for the dashboard
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  getCachedUserJobs,
  getCachedUserBids,
  getCachedUserPayments,
  getCachedUserProperties,
  getCachedUserSubscriptions,
  getCachedUserMessages,
  getCachedUserQuotes,
  getCachedUser
} from '@/lib/cache';
import { RecommendationsService } from '@/lib/services/RecommendationsService';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { Job, Property, Subscription, Payment, MessageWithContent, BidWithRelations, QuoteWithRelations } from './types';

export interface DashboardData {
  homeownerProfile: {
    first_name: string;
    last_name: string;
    email: string;
    profile_image_url?: string;
  } | null;
  jobs: Job[];
  jobIds: string[];
  bids: BidWithRelations[];
  quotes: QuoteWithRelations[];
  recentActivity: MessageWithContent[];
  properties: Property[];
  subscriptions: Subscription[];
  payments: Payment[];
  recommendations: unknown[];
  onboardingStatus: {
    completed: boolean;
  };
}

/**
 * Fetch all dashboard data for a homeowner
 */
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  // Fetch homeowner profile (cached)
  const homeownerProfile = await getCachedUser(userId);

  // Fetch jobs first (needed for bids query)
  const homeownerJobs = await getCachedUserJobs(userId, 50);
  const jobs = (homeownerJobs || []) as Job[];
  const jobIds = jobs.map((j) => j.id);

  // Fetch remaining data in parallel
  const [
    bidsData,
    quotesData,
    recentActivity,
    propertiesData,
    subscriptionsData,
    paymentsData,
    recommendations,
    onboardingStatus
  ] = await Promise.all([
    getCachedUserBids(userId, jobIds, 10),
    getCachedUserQuotes(userId, jobIds, 10),
    getCachedUserMessages(userId, 10),
    getCachedUserProperties(userId, 20),
    getCachedUserSubscriptions(userId, 20),
    getCachedUserPayments(userId, 50),
    RecommendationsService.getRecommendations(userId),
    OnboardingService.checkOnboardingStatus(userId),
  ]);

  return {
    homeownerProfile,
    jobs,
    jobIds,
    bids: (bidsData || []) as BidWithRelations[],
    quotes: (quotesData || []) as QuoteWithRelations[],
    recentActivity: (recentActivity || []) as MessageWithContent[],
    properties: (propertiesData || []) as Property[],
    subscriptions: (subscriptionsData || []) as Subscription[],
    payments: (paymentsData || []) as Payment[],
    recommendations: recommendations || [],
    onboardingStatus: onboardingStatus || { completed: false },
  };
}

