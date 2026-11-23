import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ContractManagement } from '@/app/jobs/[id]/components/ContractManagement';
import { getCurrentUserFromCookies } from '@/lib/auth';
import {
  paperworkHref,
  readPaperworkFilters,
} from '@/lib/documents/paperwork-navigation';
import { isValidUUID } from '@/lib/validation/uuid';

export const metadata: Metadata = { title: 'Contract agreement | Mintenance' };

export default async function AgreementPage({
  params,
  searchParams,
}: {
  params: Promise<{ contractId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ contractId: requestedId }, rawFilters, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUserFromCookies(),
  ]);
  const contractId = requestedId.toLowerCase();
  const filters = readPaperworkFilters({
    get: (key) => {
      const value = rawFilters[key];
      return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
    },
  });
  if (!user) {
    const destination = paperworkHref(filters, contractId);
    redirect(`/login?${new URLSearchParams({ redirect: destination })}`);
  }
  if (user.role !== 'homeowner') redirect('/dashboard');

  return (
    <div className='mx-auto max-w-4xl space-y-4'>
      <Link
        href={paperworkHref(filters)}
        className='inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-teal-800 hover:underline'
      >
        <ArrowLeft size={16} aria-hidden='true' />
        Back to job paperwork
      </Link>
      <h1 className='t-h1 text-2xl font-semibold'>Contract agreement</h1>
      {isValidUUID(contractId) ? (
        <ContractManagement
          key={contractId}
          contractId={contractId}
          userRole='homeowner'
        />
      ) : (
        <p
          role='status'
          className='rounded-xl border border-gray-200 bg-white p-6'
        >
          This agreement is unavailable.
        </p>
      )}
    </div>
  );
}
