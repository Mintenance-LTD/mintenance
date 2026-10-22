import type { Metadata } from 'next';
import { TenantReportForm } from './TenantReportForm';

export const metadata: Metadata = {
  title: 'Report a Maintenance Issue | Mintenance',
  description: 'Report a maintenance issue to your property manager.',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function TenantReportPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className='min-h-screen bg-[#f3f7f4]'>
      {/* Simple public header */}
      <header className='bg-white border-b border-gray-200 px-4 py-4'>
        <div className='max-w-5xl mx-auto flex items-center gap-2'>
          <div className='w-8 h-8 bg-[#2d6a5b] rounded-lg flex items-center justify-center'>
            <span className='text-white font-bold text-sm'>M</span>
          </div>
          <span className='font-semibold text-gray-900'>Mintenance</span>
        </div>
      </header>

      <main className='max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-10'>
        <TenantReportForm token={token} />
      </main>

      <footer className='text-center py-6 text-xs text-gray-400'>
        Powered by Mintenance
      </footer>
    </div>
  );
}
