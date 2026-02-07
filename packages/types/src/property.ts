/**
 * Property type for homeowners
 */
export interface Property {
  id: string;
  homeowner_id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  property_type: 'house' | 'flat' | 'bungalow' | 'maisonette' | 'other';
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  square_footage?: number;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}
