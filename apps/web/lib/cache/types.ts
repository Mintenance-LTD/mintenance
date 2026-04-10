/**
 * Shared types for cached Supabase queries
 */

export interface HomeownerData {
  id: string;
  first_name: string;
  last_name: string;
  city?: string;
  profile_image_url?: string;
}

export interface JobWithPhotos {
  id: string;
  photos?: string[] | unknown;
  homeowner_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  timeline?: unknown;
  photoUrls?: string[];
  homeowner?: HomeownerData | null;
  [key: string]: unknown;
}

interface PhotoData {
  job_id: string;
  photo_url: string;
  display_order?: number;
}

export interface SubscriptionData {
  id: string;
  status: string;
  current_period_end?: string;
  next_billing_date?: string;
  [key: string]: unknown;
}

export interface MessageData {
  id: string;
  content?: string;
  message_text?: string;
  sender_id: string;
  created_at: string;
  [key: string]: unknown;
}

export interface PaymentData {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_date?: string;
  due_date?: string;
}

/**
 * Helper function to extract Supabase error information
 * Supabase errors have non-enumerable properties, so we use JSON.parse(JSON.stringify())
 */
export function extractSupabaseError(error: unknown): Record<string, unknown> {
  if (!error) {
    return { message: 'Unknown error' };
  }

  try {
    // JSON.stringify/parse works for Supabase errors even when properties aren't enumerable
    return JSON.parse(JSON.stringify(error));
  } catch {
    return { message: String(error) };
  }
}
