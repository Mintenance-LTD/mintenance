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
  getCachedUserQuotes
} from '@/lib/cache';
import { RecommendationsService } from '@/lib/services/RecommendationsService';
import { OnboardingService } from '@/lib/services/OnboardingService';

export interface DashboardData {
  homeownerProfile: {
    first_name: string;
    last_name: string;
    email: string;
    profile_image_url?: string;
  } | null;
  jobs: unknown[];
  jobIds: string[];
  bids: unknown[];
  quotes: unknown[];
  recentActivity: unknown[];
  properties: unknown[];
  subscriptions: unknown[];
  payments: unknown[];
  recommendations: unknown[];
  onboardingStatus: {
    completed: boolean;
    [key: string]: unknown;
  };
}

/**
 * Fetch all dashboard data for a homeowner
 */
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  // Fetch homeowner profile
  const { data: homeownerProfile } = await serverSupabase
    .from('users')
    .select('first_name, last_name, email, profile_image_url')
    .eq('id', userId)
    .single();

  // Fetch jobs first (needed for bids query)
  const homeownerJobs = await getCachedUserJobs(userId, 50);
  const jobs = homeownerJobs || [];
  const jobIds = jobs.map((j: { id: string }) => j.id);

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
    bids: bidsData || [],
    quotes: quotesData || [],
    recentActivity: recentActivity || [],
    properties: propertiesData || [],
    subscriptions: subscriptionsData || [],
    payments: paymentsData || [],
    recommendations: recommendations || [],
    onboardingStatus: onboardingStatus || { completed: false },
  };
}

