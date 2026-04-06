import { AssessmentStep } from '../types';

// ---------------------------------------------------------------------------
// Property info form state
// ---------------------------------------------------------------------------
export interface PropertyInfo {
  propertyType: string;
  bedrooms: string;
  yearBuilt: string;
  description: string;
}

export const PROPERTY_TYPES = ['House', 'Flat', 'Bungalow', 'Commercial', 'Other'];

// ---------------------------------------------------------------------------
// Initial steps
// ---------------------------------------------------------------------------
export const INITIAL_STEPS: AssessmentStep[] = [
  {
    id: 'property_info',
    title: 'Property Information',
    description: 'Basic details about the property',
    icon: 'home',
    status: 'pending',
    required: true,
  },
  {
    id: 'video_walkthrough',
    title: 'Video Walkthrough',
    description: 'Capture 30-60 second property video',
    icon: 'videocam',
    status: 'pending',
    required: true,
  },
  {
    id: 'photos',
    title: 'Additional Photos',
    description: 'Capture specific damage areas',
    icon: 'photo-camera',
    status: 'pending',
    required: false,
  },
  {
    id: 'manual_notes',
    title: 'Manual Notes',
    description: 'Add observations and context',
    icon: 'edit-note',
    status: 'pending',
    required: false,
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review assessment before submitting',
    icon: 'fact-check',
    status: 'pending',
    required: true,
  },
];
