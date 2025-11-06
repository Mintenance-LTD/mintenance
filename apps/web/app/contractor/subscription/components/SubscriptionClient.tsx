'use client';

import React, { useState } from 'react';
import { SubscriptionService, SubscriptionPlanDetails, Subscription } from '@/lib/services/subscription/SubscriptionService';
import { TrialService, TrialStatus } from '@/lib/services/subscription/TrialService';
import { SubscriptionPlans } from './SubscriptionPlans';
import { TrialStatusBanner } from './TrialStatusBanner';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface SubscriptionClientProps {
  subscription: Subscription | null;
  trialStatus: TrialStatus | null;
  plans: SubscriptionPlanDetails[];
  contractorId: string;
}

export function SubscriptionClient({
  subscription,
  trialStatus,
  plans,
  contractorId,
}: SubscriptionClientProps) {
  const [currentSubscription, setCurrentSubscription] = useState(subscription);
  const [isLoading, setIsLoading] = useState(false);
  const { csrfToken, loading: csrfLoading } = useCSRF();

  const handleSubscribe = async (planType: SubscriptionPlanDetails['planType']) => {
    if (!csrfToken) {
      alert('Security token not available. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ planType }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Include details if available for better debugging
        const errorMessage = data.error || 'Failed to create subscription';
        const details = data.details ? `: ${data.details}` : '';
        const debugInfo = data.debug ? ` (Debug: ${JSON.stringify(data.debug)})` : '';
        throw new Error(`${errorMessage}${details}${debugInfo}`);
      }

      if (data.clientSecret && data.requiresPayment) {
        // Redirect to checkout page to complete payment
        window.location.href = `/contractor/subscription/checkout?clientSecret=${encodeURIComponent(data.clientSecret)}&subscriptionId=${encodeURIComponent(data.stripeSubscriptionId)}&planType=${encodeURIComponent(planType)}`;
        return;
      } else {
        // Refresh subscription status
        const statusResponse = await fetch('/api/subscriptions/status');
        const statusData = await statusResponse.json();
        setCurrentSubscription(statusData.subscription);
        
        // Show success message
        if (data.isUpgrade) {
          alert(`Successfully ${planType === currentSubscription?.planType ? 'updated' : 'upgraded'} to ${planType} plan!`);
        } else {
          alert('Subscription created successfully!');
        }
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription. Please try again.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription) return;

    if (!confirm('Are you sure you want to cancel your subscription? You will lose access when the current period ends.')) {
      return;
    }

    if (!csrfToken) {
      alert('Security token not available. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Refresh subscription status
      const statusResponse = await fetch('/api/subscriptions/status');
      const statusData = await statusResponse.json();
      setCurrentSubscription(statusData.subscription);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: theme.spacing[8] }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          Subscription & Billing
        </h1>
        <p style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.textSecondary,
        }}>
          Manage your subscription plan and billing preferences
        </p>
      </div>

      {/* Trial Status Banner */}
      {trialStatus && trialStatus.isTrialActive && (
        <TrialStatusBanner
          daysRemaining={trialStatus.daysRemaining}
          trialEndsAt={trialStatus.trialEndsAt}
        />
      )}

      {/* Current Subscription */}
      {currentSubscription && (
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          marginBottom: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing[4],
          }}>
            <div>
              <h2 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[1],
              }}>
                Current Plan: {currentSubscription.planName}
              </h2>
              <p style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textSecondary,
              }}>
                {formatCurrency(currentSubscription.amount)}/{currentSubscription.currency === 'gbp' ? 'month' : 'mo'}
              </p>
            </div>
            <div style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: currentSubscription.status === 'active' 
                ? theme.colors.success + '20' 
                : theme.colors.warning + '20',
              borderRadius: theme.borderRadius.full,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: currentSubscription.status === 'active' 
                ? theme.colors.success 
                : theme.colors.warning,
            }}>
              {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
            </div>
          </div>

          {currentSubscription.currentPeriodEnd && (
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[4],
            }}>
              Next billing date: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}

          {currentSubscription.cancelAtPeriodEnd && (
            <div style={{
              padding: theme.spacing[3],
              backgroundColor: theme.colors.warning + '20',
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing[4],
            }}>
              <p style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.warning,
              }}>
                Your subscription will be canceled at the end of the current billing period.
              </p>
            </div>
          )}

          <button
            onClick={handleCancel}
            disabled={isLoading || currentSubscription.cancelAtPeriodEnd}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.error}`,
              borderRadius: theme.borderRadius.md,
              color: theme.colors.error,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: isLoading || currentSubscription.cancelAtPeriodEnd ? 'not-allowed' : 'pointer',
              opacity: isLoading || currentSubscription.cancelAtPeriodEnd ? 0.5 : 1,
            }}
          >
            {currentSubscription.cancelAtPeriodEnd ? 'Cancelation Scheduled' : 'Cancel Subscription'}
          </button>
        </div>
      )}

      {/* Subscription Plans */}
      <SubscriptionPlans
        plans={plans}
        currentPlan={currentSubscription?.planType}
        onSubscribe={handleSubscribe}
        isLoading={isLoading || csrfLoading}
      />
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

