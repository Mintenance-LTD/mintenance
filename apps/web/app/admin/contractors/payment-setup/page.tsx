import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { PaymentSetupDashboardClient } from './components/PaymentSetupDashboardClient';

export default async function PaymentSetupPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  const contractors = await PaymentSetupNotificationService.getContractorsNeedingSetup();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Contractors Needing Payment Setup</h1>
        <p className="text-gray-600">
          Contractors with pending escrow payments who haven't completed payment account setup.
        </p>
      </div>
      <PaymentSetupDashboardClient contractors={contractors} />
    </div>
  );
}

