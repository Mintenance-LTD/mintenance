
/** Duck-typed interface for Supabase filter builder chains used in search functions. */
export interface QueryBuilder {
  overlaps(column: string, value: unknown[]): QueryBuilder;
  gt(column: string, value: unknown): QueryBuilder;
  gte(column: string, value: unknown): QueryBuilder;
  lte(column: string, value: unknown): QueryBuilder;
  in(column: string, values: unknown[]): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  contains(column: string, value: unknown): QueryBuilder;
  ilike(column: string, value: string): QueryBuilder;
  filter(column: string, operator: string, value: unknown): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  range(from: number, to: number): QueryBuilder;
  limit(count: number): QueryBuilder;
  select(columns?: string): QueryBuilder;
  or(filters: string): QueryBuilder;
}

export interface DatabaseContractorProfileRow {
  id: string;
  user_id: string;
  bio: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  rating: number | null;
  review_count: number | null;
  verified: boolean | null;
  location_city: string | null;
  location_state: string | null;
  location_coordinates: { latitude: number; longitude: number } | null;
  availability_immediate: boolean | null;
  availability_this_week: boolean | null;
  availability_this_month: boolean | null;
  completed_jobs: number | null;
  response_time: string | null;
  users?: {
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
  };
}

export interface DatabaseJobRow {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: 'hourly' | 'fixed';
  location_city: string | null;
  location_state: string | null;
  location_coordinates: { latitude: number; longitude: number } | null;
  created_at: string;
  urgency: 'low' | 'medium' | 'high' | null;
  skills_required: string[] | null;
  project_type: string;
  status: string;
  users?: {
    first_name: string;
    last_name: string;
    homeowner_rating: number | null;
    homeowner_reviews: number | null;
  };
}

export interface DatabaseUserSearchPreferenceRow {
  user_id: string;
  preferred_skills: string[] | null;
  preferred_price_range: { min: number; max: number; hourly: boolean } | null;
  preferred_location: { radius: number; unit: string; coordinates: { latitude: number; longitude: number } | null } | null;
  updated_at: string;
}

export function calculateDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
