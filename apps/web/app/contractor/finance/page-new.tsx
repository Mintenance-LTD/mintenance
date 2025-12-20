import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { FinancePageClient } from './components/FinancePageClient';

export const metadata = {
  title: 'Finance | Mintenance',
  description: 'Manage invoices, payments, and financial reports',
};

export default async function ContractorFinancePage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  return <FinancePageClient />;
}
