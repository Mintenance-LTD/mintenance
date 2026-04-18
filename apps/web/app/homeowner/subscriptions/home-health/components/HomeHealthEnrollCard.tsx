'use client';

/**
 * HomeHealthEnrollCard — client-side enroll/cancel for Home Health.
 *
 * Flow:
 *   1. Load existing subscription + homeowner's properties
 *   2. If no subscription, show property picker + "Enroll £9.99/mo" CTA
 *   3. POST /api/subscriptions/home-health → returns clientSecret
 *      (client-side Stripe Elements would confirm the PaymentIntent;
 *      for now we surface the Stripe-hosted payment link from Checkout
 *      as a follow-up — this form captures the subscription intent and
 *      tells the user what's next)
 *   4. If subscription exists, show active plan + cancel button
 */

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, Calendar, XCircle, Sparkles } from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  plan_type: string;
  amount: number;
  currency: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  metadata: { propertyId?: string; source?: string } | null;
}

interface Property {
  id: string;
  property_name: string;
  address: string;
}

const HOME_HEALTH_BENEFITS = [
  'Annual boiler service (Gas Safe)',
  'Smoke-alarm check (twice a year)',
  'Gutter clean & roof inspection (twice a year)',
  'Verified contractors only',
  'Cancel any time',
];

export function HomeHealthEnrollCard() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [subRes, propRes] = await Promise.all([
        fetch('/api/subscriptions/home-health', { credentials: 'include' }),
        fetch('/api/properties', { credentials: 'include' }),
      ]);
      if (subRes.ok) {
        const body = await subRes.json();
        setSub(body.subscription ?? null);
      }
      if (propRes.ok) {
        const body = await propRes.json();
        const list = (body.properties ?? body ?? []) as Property[];
        setProperties(list);
        if (list[0]) setSelectedProperty(list[0].id);
      }
    } catch {
      // tolerate
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const enroll = async () => {
    if (!selectedProperty) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions/home-health', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedProperty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `status ${res.status}`);

      if (data.clientSecret) {
        toast.success(
          "Subscription created. We'll email you a payment link to complete setup."
        );
      } else {
        toast.success('Subscription created. Home Health is now active.');
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async () => {
    if (
      !window.confirm(
        'Cancel Home Health at the end of your current billing period?'
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions/home-health', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `status ${res.status}`);
      toast.success(
        "Cancellation scheduled. You'll keep Home Health until the end of the current period."
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className='text-sm text-gray-500'>Loading…</p>;
  }

  if (sub && ['active', 'trial', 'past_due'].includes(sub.status)) {
    return (
      <div className='bg-white border border-gray-200 rounded-2xl p-6'>
        <div className='flex items-center gap-2 text-emerald-700 mb-3'>
          <CheckCircle className='w-5 h-5' />
          <span className='font-semibold'>Home Health is active</span>
        </div>
        <p className='text-sm text-gray-600 mb-4'>
          £{sub.amount.toFixed(2)}/{sub.currency} ·{' '}
          {sub.cancel_at_period_end
            ? 'cancels at end of current period'
            : 'renews automatically'}
        </p>
        <button
          onClick={cancel}
          disabled={submitting}
          className='inline-flex items-center gap-2 px-4 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-sm font-semibold disabled:opacity-50'
        >
          <XCircle className='w-4 h-4' />
          {submitting ? 'Cancelling…' : 'Cancel subscription'}
        </button>
      </div>
    );
  }

  return (
    <div className='bg-white border border-gray-200 rounded-2xl p-6'>
      <div className='flex items-center gap-2 text-teal-700 mb-4'>
        <Sparkles className='w-5 h-5' />
        <span className='font-semibold uppercase tracking-wide text-xs'>
          £9.99/mo — cancel any time
        </span>
      </div>
      <ul className='space-y-2 mb-6'>
        {HOME_HEALTH_BENEFITS.map((b) => (
          <li key={b} className='flex items-start gap-2 text-sm text-gray-700'>
            <CheckCircle className='w-4 h-4 text-emerald-600 mt-0.5' />
            {b}
          </li>
        ))}
      </ul>

      {properties.length === 0 ? (
        <p className='text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4'>
          Add a property first — Home Health is linked to a single property you
          own.
        </p>
      ) : (
        <>
          <label className='block text-sm mb-4'>
            <span className='text-gray-700 font-medium'>
              Choose the property
            </span>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2'
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_name} — {p.address}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={enroll}
            disabled={submitting || !selectedProperty}
            className='inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50'
          >
            <Calendar className='w-4 h-4' />
            {submitting ? 'Enrolling…' : 'Start Home Health — £9.99/mo'}
          </button>
        </>
      )}
    </div>
  );
}

export default HomeHealthEnrollCard;
