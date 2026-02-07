import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Correct Assessment Detections | Mintenance',
  description: 'Help improve AI accuracy by correcting building assessment detections for continuous learning.',
};

export default function CorrectAssessmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
