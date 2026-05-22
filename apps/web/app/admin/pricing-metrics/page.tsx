import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PricingMetricsClient } from './PricingMetricsClient';

export const metadata = {
  title: 'Pricing Metrics | Mintenance Admin',
  description:
    'Post-rollout observability for the tiered pricing model. Tier distribution, fee revenue by tier, SLA performance, active-jobs cap pressure.',
};

/**
 * /admin/pricing-metrics — Sprint 5.2 (2026-05-22).
 *
 * Server-rendered shell with admin gate. Body is a client component that
 * fetches /api/admin/pricing-metrics on demand so the dashboard can be
 * refreshed without reloading the page.
 */
export default async function AdminPricingMetricsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }
  return <PricingMetricsClient />;
}
