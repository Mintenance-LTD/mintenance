import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { PaymentSetupDashboardClient } from './components/PaymentSetupDashboardClient';

export default async function PaymentSetupPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  const contractors = await PaymentSetupNotificationService.getContractorsNeedingSetup();

  return <PaymentSetupDashboardClient contractors={contractors} />;
}

