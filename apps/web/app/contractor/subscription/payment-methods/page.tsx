import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PaymentMethodForm } from './components/PaymentMethodForm';
import { PaymentMethodsList } from './components/PaymentMethodsList';
import { StandardCard } from '@/components/ui/StandardCard';

export const metadata = {
  title: 'Payment Methods | Mintenance',
  description: 'Manage your payment methods',
};

export default async function PaymentMethodsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  interface PaymentMethod {
    id: string;
    type: 'card' | 'bank_account';
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
    bank_account?: {
      bank_name: string;
      last4: string;
    };
    isDefault?: boolean;
  }

  // Fetch existing payment methods from Stripe (if integrated)
  // For now, we'll use a placeholder
  const paymentMethods: PaymentMethod[] = [];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage your payment methods for receiving payments
        </p>
      </div>

      <div className="space-y-6">
        {/* Add Payment Method Form */}
        <PaymentMethodForm />

        {/* Existing Payment Methods */}
        <PaymentMethodsList paymentMethods={paymentMethods} />
      </div>
    </div>
  );
}

