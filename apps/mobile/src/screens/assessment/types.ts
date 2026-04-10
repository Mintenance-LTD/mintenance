export interface AssessmentStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'completed';
  required: boolean;
}

interface AssessmentVideo {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uri?: string;
  thumbnailUri?: string;
  duration?: number;
}

interface AssessmentResults {
  total_damages: number;
  confidence_level: string;
}

interface AssessmentNavigationParams {
  propertyId?: string;
  propertyAddress?: string;
}
