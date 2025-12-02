'use client';

import React from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { Button } from '@/components/ui/Button';
import { Trash2, Edit } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  isDefault?: boolean;
}

interface PaymentMethodsListProps {
  paymentMethods: PaymentMethod[];
}

export function PaymentMethodsList({ paymentMethods }: PaymentMethodsListProps) {
  if (paymentMethods.length === 0) {
    return (
      <StandardCard>
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">No payment methods added yet</p>
        </div>
      </StandardCard>
    );
  }

  return (
    <StandardCard>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Saved Payment Methods</h2>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {method.brand} •••• {method.last4}
                </div>
                <div className="text-sm text-gray-500">{method.type}</div>
                {method.isDefault && (
                  <span className="inline-block mt-1 text-xs text-blue-600 font-medium">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StandardCard>
  );
}

