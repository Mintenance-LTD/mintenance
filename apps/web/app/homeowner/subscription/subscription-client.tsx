'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { HOMEOWNER_TIER_PRICING } from '@/lib/feature-access-config';
import { Check, X, Crown, Building2, Users, Shield, Star, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '@mintenance/shared';

interface HomeownerSubscriptionClientProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface HomeownerStatusResponse {
  role: 'homeowner';
  subscription: {
    id: string;
    planType: string;
    planName: string;
    status: string;
    amount: number;
    currency: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    metadata?: Record<string, unknown>;
  } | null;
  requiresSubscription: boolean;
  earlyAccess?: {
    eligible: boolean;
  };
}

type TierKey = 'free' | 'landlord' | 'agency';

const TIER_ORDER: TierKey[] = ['free', 'landlord', 'agency'];

const PLAN_FEATURES: Record<TierKey, string[]> = {
  free: [
    'Post unlimited jobs',
    'Manage 1 property',
    'AI-powered pro matching',
    'View verified pro profiles',
    'Standard messaging',
    'Payment protection',
    'Review system',
    'AI building assessment',
  ],
  landlord: [
    'Up to 25 properties',
    'Compliance dashboard (gas, electrical, EPC)',
    'Expiry reminders (90/30/7 days)',
    'One-click renewal job creation',
    'Tenant reporting links',
    'Tenant & contact records',
    'Recurring maintenance scheduling',
    'Per-property spend analytics',
    'Priority contractor matching',
  ],
  agency: [
    'Unlimited properties',
    'Team member invites (up to 10)',
    'Role-based access (admin/manager/viewer)',
    'Activity audit log',
    'Bulk job posting',
    'Bulk compliance export (PDF)',
    'Year-over-year comparison',
    'Dedicated support',
  ],
};

const TIER_CONFIG: Record<TierKey, { icon: typeof Star; color: string; bgColor: string; borderColor: string }> = {
  free: { icon: Star, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' },
  landlord: { icon: Building2, color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
  agency: { icon: Users, color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
};

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency?.toUpperCase?.() || 'GBP',
  }).format(amount);
}

export function HomeownerSubscriptionClient({ user }: HomeownerSubscriptionClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { csrfToken } = useCSRF();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<HomeownerStatusResponse | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const success = searchParams.get('success');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subscriptions/status', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to load subscription status');
      }
      setData(json as HomeownerStatusResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (success === 'true') {
      setMessage('Subscription activated successfully! Your new features are now available.');
    }
  }, [success]);

  const currentTier: TierKey = useMemo(() => {
    if (!data?.subscription) return 'free';
    const pt = data.subscription.planType;
    if (pt === 'landlord') return 'landlord';
    if (pt === 'agency') return 'agency';
    return 'landlord'; // 'premium' maps to landlord
  }, [data]);

  const billingCycle = useMemo(() => {
    const raw = data?.subscription?.metadata?.billingCycle;
    if (raw === 'yearly') return 'year';
    if (raw === 'monthly') return 'month';
    if (data?.subscription?.amount === 249 || data?.subscription?.amount === 499) return 'year';
    return 'month';
  }, [data]);

  const handleCancel = async (cancelAtPeriodEnd: boolean) => {
    if (!csrfToken) {
      setError('Security token missing. Refresh and try again.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Failed to cancel subscription');
      setMessage(json?.message || 'Subscription updated.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!csrfToken) {
      setError('Security token missing. Refresh and try again.');
      return;
    }
    setUpgradingPlan(planId);
    setError(null);
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ planType: planId, billingCycle: isAnnual ? 'yearly' : 'monthly' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to start ${planId} checkout`);

      if (result.requiresPayment && result.clientSecret) {
        const subscriptionRef = result.stripeSubscriptionId || result.subscriptionId;
        router.push(
          `/homeowner/subscription/checkout?clientSecret=${encodeURIComponent(result.clientSecret)}&subscriptionId=${encodeURIComponent(subscriptionRef)}&planType=${encodeURIComponent(planId)}`
        );
        return;
      }
      setMessage(`${planId.charAt(0).toUpperCase() + planId.slice(1)} plan activated!`);
      await load();
    } catch (err) {
      logger.error('Subscription upgrade error:', err, { service: 'app' });
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const upgradePlans = TIER_ORDER.filter((t) => TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(currentTier));
  const tierConfig = TIER_CONFIG[currentTier];
  const TierIcon = tierConfig.icon;

  // Get all included features for current tier
  const includedFeatures: string[] = [];
  const lockedFeatures: string[] = [];
  for (const tier of TIER_ORDER) {
    if (TIER_ORDER.indexOf(tier) <= TIER_ORDER.indexOf(currentTier)) {
      includedFeatures.push(...PLAN_FEATURES[tier]);
    } else {
      lockedFeatures.push(...PLAN_FEATURES[tier]);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <header className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tierConfig.bgColor}`}>
            <TierIcon className={`h-6 w-6 ${tierConfig.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
              <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${tierConfig.bgColor} ${tierConfig.color} border ${tierConfig.borderColor}`}>
                {HOMEOWNER_TIER_PRICING[currentTier].name}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Manage your plan and billing preferences
            </p>
          </div>
        </div>
      </header>

      {/* Banners */}
      {loading && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading subscription details...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {message}
        </div>
      )}

      {!loading && data && (
        <>
          {data.earlyAccess?.eligible && (
            <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-700">
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span>Early-access entitlement is active on your account — enjoy premium features free during the beta.</span>
            </div>
          )}

          {/* Current Plan Card */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Current Plan</h2>

            {data.subscription ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{data.subscription.planName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatAmount(data.subscription.amount, data.subscription.currency)} / {billingCycle}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    data.subscription.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : data.subscription.status === 'past_due'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {data.subscription.status.charAt(0).toUpperCase() + data.subscription.status.slice(1).replace('_', ' ')}
                  </span>
                </div>

                {data.subscription.currentPeriodEnd && (
                  <p className="text-sm text-gray-500">
                    Next billing date: <span className="font-medium text-gray-700">{new Date(data.subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </p>
                )}

                {data.subscription.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Cancellation scheduled for end of current billing period.
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => void handleCancel(true)}
                    disabled={saving || data.subscription.cancelAtPeriodEnd}
                    className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Cancel At Period End'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCancel(false)}
                    disabled={saving}
                    className="inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Cancel Immediately'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Free Plan</h3>
                  <p className="text-sm text-gray-500 mt-1">Core features for managing your home</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  Free
                </span>
              </div>
            )}
          </section>

          {/* Your Plan Includes */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Your Plan Includes</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {includedFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 py-1.5">
                  <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {lockedFeatures.length > 0 && (
              <>
                <div className="mt-5 mb-3 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Upgrade to unlock</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                  {lockedFeatures.map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5 py-1.5">
                      <X className="h-4 w-4 flex-shrink-0 text-gray-300" />
                      <span className="text-sm text-gray-400">{feature}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Upgrade Plans */}
          {upgradePlans.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Upgrade Your Plan</h2>
                  <p className="text-xs text-gray-500 mt-1">Unlock more features for your property portfolio</p>
                </div>

                {/* Annual / Monthly toggle */}
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setIsAnnual(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      !isAnnual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAnnual(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isAnnual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Annual
                    <span className="ml-1 text-emerald-600 font-semibold">-17%</span>
                  </button>
                </div>
              </div>

              <div className={`grid gap-6 ${upgradePlans.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-2'}`}>
                {upgradePlans.map((planKey) => {
                  const plan = HOMEOWNER_TIER_PRICING[planKey];
                  const config = TIER_CONFIG[planKey];
                  const PlanIcon = config.icon;
                  const price = isAnnual && 'annualPrice' in plan ? plan.annualPrice : plan.price;
                  const period = isAnnual ? 'year' : 'month';
                  const isPopular = 'popular' in plan && plan.popular;
                  const isUpgrading = upgradingPlan === planKey;

                  return (
                    <div
                      key={planKey}
                      className={`relative rounded-xl border-2 p-6 transition-all hover:shadow-md ${
                        isPopular ? 'border-teal-400 shadow-sm' : 'border-gray-200'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-0.5 text-xs font-semibold text-white">
                            <Crown className="h-3 w-3" /> Most Popular
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}>
                          <PlanIcon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                          <p className="text-xs text-gray-500">{plan.description}</p>
                        </div>
                      </div>

                      <div className="mb-5">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatAmount(price as number, 'GBP')}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">/ {period}</span>
                        {isAnnual && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Save {formatAmount((plan.price as number) * 12 - (price as number), 'GBP')} per year
                          </p>
                        )}
                      </div>

                      <ul className="space-y-2.5 mb-6">
                        {PLAN_FEATURES[planKey].map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-teal-500" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        onClick={() => void handleUpgrade(planKey)}
                        disabled={!!upgradingPlan}
                        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                          isPopular
                            ? 'bg-teal-600 text-white hover:bg-teal-700'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                      >
                        {isUpgrading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
