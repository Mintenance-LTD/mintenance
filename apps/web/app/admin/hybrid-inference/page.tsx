import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { HybridInferenceStatsClient } from './components/HybridInferenceStatsClient';

export const metadata = {
  title: 'Hybrid Inference | Admin',
  description:
    'Monitor hybrid AI inference routing, confidence scores, and model performance.',
};

export default async function HybridInferencePage() {
  const user = await getCurrentUserFromCookies();
  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  return <HybridInferenceStatsClient />;
}
