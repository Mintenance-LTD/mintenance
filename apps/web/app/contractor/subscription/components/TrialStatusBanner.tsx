import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { AlertTriangle, Info } from 'lucide-react';

interface TrialStatusBannerProps {
  daysRemaining: number;
  trialEndsAt: Date | null;
}

interface TrialWarning {
  daysRemaining: number;
  level: 'info' | 'warning' | 'urgent';
  message: string;
}

function getTrialWarnings(daysRemaining: number): TrialWarning | null {
  if (daysRemaining <= 0) {
    return {
      daysRemaining: 0,
      level: 'urgent',
      message: 'Your trial has expired. Please subscribe to continue using the platform.',
    };
  }

  if (daysRemaining <= 1) {
    return {
      daysRemaining,
      level: 'urgent',
      message: `Your trial expires in ${daysRemaining} day. Please subscribe to avoid service interruption.`,
    };
  }

  if (daysRemaining <= 3) {
    return {
      daysRemaining,
      level: 'warning',
      message: `Your trial expires in ${daysRemaining} days. Subscribe now to continue.`,
    };
  }

  if (daysRemaining <= 7) {
    return {
      daysRemaining,
      level: 'info',
      message: `Your trial expires in ${daysRemaining} days. Consider subscribing to continue.`,
    };
  }

  return null;
}

export function TrialStatusBanner({ daysRemaining, trialEndsAt }: TrialStatusBannerProps) {
  const warning = getTrialWarnings(daysRemaining);

  if (!warning) {
    return null;
  }

  const getAlertVariant = () => {
    switch (warning.level) {
      case 'urgent':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Alert variant={getAlertVariant()} className="mb-6">
      {warning.level === 'urgent' ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Info className="h-5 w-5" />
      )}
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold mb-1">{warning.message}</p>
          {trialEndsAt && (
            <p className="text-sm opacity-80">
              Trial ends: {trialEndsAt.toLocaleDateString()}
            </p>
          )}
        </div>
        <Link href="/contractor/subscription">
          <Button variant="primary" size="sm">
            Subscribe Now
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}

