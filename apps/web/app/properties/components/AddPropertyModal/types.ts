export interface AddPropertyFormData {
  property_name: string;
  address: string;
  property_type: 'residential' | 'commercial' | 'rental';
  is_primary: boolean;
}

export interface LocationSuggestion {
  display_name: string;
  place_id: string;
}

export interface ImagePreview {
  file: File;
  preview: string;
}

export interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
