import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LandingNavigation } from '@/app/components/landing/LandingNavigation';
import { Footer2025 } from '@/app/components/landing/Footer2025';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <LandingNavigation />
      <main className='flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-12'>
          <h1 className='text-4xl font-bold text-gray-900 mb-2'>{title}</h1>
          <p className='text-gray-500 mb-8'>Last updated: {lastUpdated}</p>
          <div className='prose prose-lg max-w-none'>{children}</div>
        </div>

        <div className='mt-12 pt-8 border-t border-gray-200'>
          <Link
            href='/'
            className='inline-flex items-center text-teal-600 hover:text-teal-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded'
          >
            <ArrowLeft className='w-5 h-5 mr-2' aria-hidden='true' />
            Back to Home
          </Link>
        </div>
      </main>
      <Footer2025 />
    </div>
  );
}
