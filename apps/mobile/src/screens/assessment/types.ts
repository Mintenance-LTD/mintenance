export interface AssessmentStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'completed';
  required: boolean;
}

export interface AssessmentVideo {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uri?: string;
  thumbnailUri?: string;
  duration?: number;
}

export interface AssessmentResults {
  total_damages: number;
  confidence_level: string;
}

export interface AssessmentNavigationParams {
  propertyId?: string;
  propertyAddress?: string;
}
