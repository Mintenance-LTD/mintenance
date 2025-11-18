'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckCircle2 } from 'lucide-react';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';

interface FeeBreakdownProps {
  amount: number;
  paymentType?: 'deposit' | 'final' | 'milestone';
}

/**
 * Fee Breakdown Component
 * Displays transparent fee breakdown before payment
 */
export function FeeBreakdown({ amount, paymentType = 'final' }: FeeBreakdownProps) {
  if (amount <= 0) return null;

  const fees = FeeCalculationService.calculateFees(amount, { paymentType });

  return (
    <Card className="border-secondary/20">
      <CardHeader>
        <CardTitle className="text-lg">Payment Breakdown</CardTitle>
        <CardDescription>Transparent fee structure - no hidden costs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Job Amount</span>
            <span className="font-semibold">£{amount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Platform Fee (5%)</span>
            <span>£{fees.platformFee.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Payment Processing Fee</span>
            <span>£{fees.stripeFee.toFixed(2)}</span>
          </div>
          
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="font-semibold">Total Fees</span>
            <span className="font-semibold">£{fees.totalFees.toFixed(2)}</span>
          </div>
          
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="text-lg font-bold">Total Amount</span>
            <span className="text-lg font-bold text-secondary">£{amount.toFixed(2)}</span>
          </div>
        </div>

        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Payment Protection:</strong> Your payment is held securely in escrow until the job is completed to your satisfaction.
          </AlertDescription>
        </Alert>

        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500">
            Platform fee is capped at £50 maximum. Payment processing fees are standard Stripe charges (2.9% + £0.30).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Fee Visibility Banner
 * Shows fees prominently before payment
 */
export function FeeVisibilityBanner({ amount }: { amount: number }) {
  if (amount <= 0) return null;

  const fees = FeeCalculationService.calculateFees(amount);
  const feePercentage = ((fees.totalFees / amount) * 100).toFixed(1);

  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <strong className="text-blue-900">Transparent Pricing:</strong>
            <span className="text-blue-700 ml-2">
              Total fees: £{fees.totalFees.toFixed(2)} ({feePercentage}% of job amount)
            </span>
          </div>
          <div className="text-sm text-blue-600">
            Platform fee: £{fees.platformFee.toFixed(2)} • Processing: £{fees.stripeFee.toFixed(2)}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

