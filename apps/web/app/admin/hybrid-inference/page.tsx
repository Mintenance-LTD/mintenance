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

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto space-y-8'>
      {/* Page Header */}
      <div className='mb-2'>
        <div className='flex items-end gap-3 mb-2'>
          <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
            Hybrid Inference
          </h2>
          <div className='flex items-center gap-2 px-3 py-1 bg-[#e3dbfd] text-[#514d68] rounded-full text-xs font-semibold mb-2'>
            <span className='w-1.5 h-1.5 rounded-full bg-[#514d68] animate-pulse' />
            ACTIVE SYSTEM
          </div>
        </div>
        <p className='text-[#566166] max-w-2xl text-lg'>
          Real-time status of internal neural networks bridged with large
          language vision models for adaptive predictive maintenance.
        </p>
      </div>

      <HybridInferenceStatsClient />
    </div>
  );
}
