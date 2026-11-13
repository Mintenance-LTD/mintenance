import type { MaterialIcons } from '@expo/vector-icons';
export interface AssessmentStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  status: 'pending' | 'in_progress' | 'completed';
  required: boolean;
}






