import { cookies } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PaymentMethodForm } from './components/PaymentMethodForm';
import { PaymentMethodsList } from './components/PaymentMethodsList';
import { MintEditorialPaymentMethodsView } from './components/MintEditorialPaymentMethodsView';
import { StandardCard } from '@/components/ui/StandardCard';

export const metadata = {
  title: 'Payment Methods | Mintenance',
  description: 'Manage your payment methods',
};

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

export default async function PaymentMethodsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // TODO(stripe-integration): replace placeholder with real Stripe
  // `paymentMethods.list` for the contractor's customer. Until that
  // ships the view renders honest empty states — we never fabricate
  // cards in either theme branch.
  const paymentMethods: PaymentMethod[] = [];

  // Mint Editorial theme branch — polished header, default-card display
  // (only when a real default exists), and the "Add a card" CTA.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return <MintEditorialPaymentMethodsView paymentMethods={paymentMethods} />;
  }

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
