/**
 * Profile Types
 * Type definitions for profile page
 */

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
}

export interface LocationSuggestion {
  display_name: string;
  place_id: string;
}

export interface GeolocationAlert {
  open: boolean;
  message: string;
}

