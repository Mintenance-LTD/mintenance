// Property type enum matching DB CHECK constraint
export type PropertyType = 'residential' | 'commercial' | 'rental' | 'house' | 'apartment'
  | 'flat' | 'detached' | 'semi-detached' | 'terraced' | 'bungalow' | 'cottage' | 'other';

/**
 * Property matching DB: public.properties
 */
export interface Property {
  id: string;
  owner_id: string;
  property_name: string;
  address?: string;
  city?: string | null;
  postcode?: string | null;
  country?: string; // DB: DEFAULT 'UK'
  property_type?: PropertyType | string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_footage?: number | null; // DB: CHECK (square_footage > 0)
  year_built?: number | null;
  photos?: string[]; // DB: TEXT[]
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  // Not in DB but kept for backward compat
  notes?: string | null;
  org_id?: string | null;
}
