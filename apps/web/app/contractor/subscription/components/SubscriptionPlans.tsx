'use client';

import React from 'react';
import { SubscriptionPlanDetails } from '@/lib/services/subscription/SubscriptionService';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface SubscriptionPlansProps {
  plans: SubscriptionPlanDetails[];
  currentPlan?: string;
  onSubscribe: (planType: SubscriptionPlanDetails['planType']) => void;
  isLoading: boolean;
}

export function SubscriptionPlans({
  plans,
  currentPlan,
  onSubscribe,
  isLoading,
}: SubscriptionPlansProps) {
  return (
    <div>
      <h2 style={{
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing[6],
      }}>
        Choose Your Plan
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: theme.spacing[6],
      }}>
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.planType;
          const isPopular = plan.planType === 'professional';

          return (
            <div
              key={plan.planType}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing[6],
                border: `2px solid ${isCurrentPlan ? theme.colors.primary : theme.colors.border}`,
                position: 'relative',
                boxShadow: isPopular ? `0 4px 12px ${theme.colors.primary}20` : 'none',
              }}
            >
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: theme.spacing[4],
                  right: theme.spacing[4],
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.white,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                }}>
                  POPULAR
                </div>
              )}

              <div style={{ marginBottom: theme.spacing[4] }}>
                <h3 style={{
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[2],
                }}>
                  {plan.name}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[4],
                }}>
                  <span style={{
                    fontSize: theme.typography.fontSize['3xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.textPrimary,
                  }}>
                    {formatCurrency(plan.price)}
                  </span>
                  <span style={{
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textSecondary,
                  }}>
                    /month
                  </span>
                </div>
              </div>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                marginBottom: theme.spacing[6],
              }}>
                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  <Icon name="check" size={16} color={theme.colors.success} />
                  {plan.features.maxJobs === null ? 'Unlimited' : `${plan.features.maxJobs} jobs`}
                </li>
                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  <Icon name="check" size={16} color={theme.colors.success} />
                  Up to {plan.features.maxActiveJobs} active jobs
                </li>
                {plan.features.prioritySupport && (
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    marginBottom: theme.spacing[3],
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}>
                    <Icon name="check" size={16} color={theme.colors.success} />
                    Priority support
                  </li>
                )}
                {plan.features.advancedAnalytics && (
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    marginBottom: theme.spacing[3],
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}>
                    <Icon name="check" size={16} color={theme.colors.success} />
                    Advanced analytics
                  </li>
                )}
                {plan.features.customBranding && (
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    marginBottom: theme.spacing[3],
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}>
                    <Icon name="check" size={16} color={theme.colors.success} />
                    Custom branding
                  </li>
                )}
                {plan.features.apiAccess && (
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    marginBottom: theme.spacing[3],
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}>
                    <Icon name="check" size={16} color={theme.colors.success} />
                    API access
                  </li>
                )}
              </ul>

              <button
                onClick={() => onSubscribe(plan.planType)}
                disabled={isLoading || isCurrentPlan}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  backgroundColor: isCurrentPlan
                    ? theme.colors.backgroundSecondary
                    : isPopular
                    ? theme.colors.primary
                    : theme.colors.surface,
                  border: `1px solid ${isCurrentPlan ? theme.colors.border : theme.colors.primary}`,
                  borderRadius: theme.borderRadius.md,
                  color: isCurrentPlan
                    ? theme.colors.textSecondary
                    : isPopular
                    ? theme.colors.white
                    : theme.colors.primary,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: isLoading || isCurrentPlan ? 'not-allowed' : 'pointer',
                  opacity: isLoading || isCurrentPlan ? 0.5 : 1,
                }}
              >
                {isCurrentPlan ? 'Current Plan' : isLoading ? 'Processing...' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

