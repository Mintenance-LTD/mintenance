'use client';

import React, { useState } from 'react';
import { SubscriptionService, SubscriptionPlanDetails, Subscription } from '@/lib/services/subscription/SubscriptionService';
import { TrialService, TrialStatus } from '@/lib/services/subscription/TrialService';
import { SubscriptionPlans } from './SubscriptionPlans';
import { TrialStatusBanner } from './TrialStatusBanner';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { Icon } from '@/components/ui/Icon';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ open: false, title: '', message: '' });
  const [cancelDialog, setCancelDialog] = useState(false);
  const [successAlert, setSuccessAlert] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const handleSubscribe = async (planType: SubscriptionPlanDetails['planType']) => {
    if (!csrfToken) {
      setAlertDialog({
        open: true,
        title: 'Security Error',
        message: 'Security token not available. Please refresh the page.',
      });
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
        if (typeof window !== 'undefined') {
          window.location.href = `/contractor/subscription/checkout?clientSecret=${encodeURIComponent(data.clientSecret)}&subscriptionId=${encodeURIComponent(data.stripeSubscriptionId)}&planType=${encodeURIComponent(planType)}`;
        }
        return;
      } else {
        // Refresh subscription status
        const statusResponse = await fetch('/api/subscriptions/status');
        const statusData = await statusResponse.json();
        setCurrentSubscription(statusData.subscription);
        
        // Show success message
        if (data.isUpgrade) {
          setSuccessAlert({ 
            show: true, 
            message: `Successfully ${planType === currentSubscription?.planType ? 'updated' : 'upgraded'} to ${planType} plan!` 
          });
        } else {
          setSuccessAlert({ show: true, message: 'Subscription created successfully!' });
        }
        setTimeout(() => setSuccessAlert({ show: false, message: '' }), 5000);
      }
    } catch (error) {
      logger.error('Error subscribing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription. Please try again.';
      setAlertDialog({
        open: true,
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription) return;
    setCancelDialog(true);
  };

  const confirmCancel = async () => {
    if (!currentSubscription) return;

    if (!csrfToken) {
      setCancelDialog(false);
      setAlertDialog({
        open: true,
        title: 'Security Error',
        message: 'Security token not available. Please refresh the page.',
      });
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
      setCancelDialog(false);
      setSuccessAlert({ show: true, message: 'Subscription cancellation scheduled successfully.' });
      setTimeout(() => setSuccessAlert({ show: false, message: '' }), 5000);
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      setCancelDialog(false);
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Failed to cancel subscription. Please try again.',
      });
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

      {/* Success Alert */}
      {successAlert.show && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {successAlert.message}
          </AlertDescription>
        </Alert>
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

          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading || currentSubscription.cancelAtPeriodEnd}
          >
            {currentSubscription.cancelAtPeriodEnd ? 'Cancelation Scheduled' : 'Cancel Subscription'}
          </Button>
        </div>
      )}

      {/* Subscription Plans */}
      <SubscriptionPlans
        plans={plans}
        currentPlan={currentSubscription?.planType}
        onSubscribe={handleSubscribe}
        isLoading={isLoading || csrfLoading}
      />

      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.open} onOpenChange={(open: boolean) => setAlertDialog({ ...alertDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAlertDialog({ open: false, title: '', message: '' })}>
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={cancelDialog} onOpenChange={(open: boolean) => setCancelDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will lose access when the current period ends.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelDialog(false)}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

