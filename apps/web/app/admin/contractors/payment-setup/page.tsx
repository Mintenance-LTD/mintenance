import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { PaymentSetupDashboardClient } from './components/PaymentSetupDashboardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contractor Payment Setup | Mintenance Admin',
  description: 'Monitor and manage contractor payment onboarding, Stripe setup status, and payment notifications.',
};

export default async function PaymentSetupPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  const contractors = await PaymentSetupNotificationService.getContractorsNeedingSetup();

  return <PaymentSetupDashboardClient contractors={contractors} />;
}

