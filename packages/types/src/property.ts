/**
 * Property type for homeowners
 *
 * Matches the actual DB schema: owner_id, property_name, address (single string),
 * property_type (residential/commercial/rental), is_primary.
 * city/postcode columns exist in DB but may be null (populated when created from mobile).
 */
export interface Property {
  id: string;
  owner_id: string;
  property_name: string;
  address: string;
  property_type: string;
  is_primary: boolean;
  photos?: string[];
  city?: string | null;
  postcode?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  square_footage?: number | null;
  notes?: string | null;
  org_id?: string | null;
  created_at: string;
  updated_at: string;
}
