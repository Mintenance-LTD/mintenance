import { redirect } from 'next/navigation';

/**
 * /payment-methods redirects to /settings/payment-methods
 * which has Stripe integration, proper layout, and auth.
 */
export default function PaymentMethodsRedirect() {
  redirect('/settings/payment-methods');
}
