/**
 * /contractor/resources — fallback placeholder.
 *
 * Audit P1 (2026-04-23): the resources feature is unbuilt. Page kept for
 * direct-URL fallback only; sidebar + landing-page footer no longer link
 * here. Re-add the sidebar entry in `components/layouts/sidebar/
 * sidebarNavConfig.ts` once contractor business resources ship.
 */

import { Package, BookOpen, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Resources | Mintenance',
  description: 'Business resources and tools for contractors.',
};

export default function ResourcesPage() {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center px-4 text-center'>
      <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-500'>
        <Package className='h-8 w-8' />
      </div>
      <h1 className='text-2xl font-bold text-navy-900'>Resources</h1>
      <p className='mx-auto mt-3 max-w-md text-base text-navy-500'>
        Access business templates, compliance guides, training materials, and
        tools to help you run a successful contracting business.
      </p>
      <div className='mt-8 flex items-center gap-8 text-sm text-navy-400'>
        <div className='flex flex-col items-center gap-1'>
          <BookOpen className='h-5 w-5' />
          <span>Guides</span>
        </div>
        <div className='flex flex-col items-center gap-1'>
          <FileText className='h-5 w-5' />
          <span>Templates</span>
        </div>
        <div className='flex flex-col items-center gap-1'>
          <Package className='h-5 w-5' />
          <span>Tools</span>
        </div>
      </div>
      <div className='mt-8 rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-700'>
        Coming soon — this feature is under development.
      </div>
      <Link
        href='/contractor/dashboard'
        className='mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700'
      >
        Back to Dashboard <ArrowRight className='h-4 w-4' />
      </Link>
    </div>
  );
}
