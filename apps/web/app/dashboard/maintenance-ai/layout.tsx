import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Maintenance Detection | Mintenance',
  description: 'Upload a photo of your maintenance issue and get instant AI-powered diagnosis and contractor recommendations.',
};

export default function MaintenanceAILayout({ children }: { children: React.ReactNode }) {
  return children;
}
