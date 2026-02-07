'use client';

import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddPaymentMethodForm } from '@/app/settings/payment-methods/components/AddPaymentMethodForm';

interface PaymentMethod {
  id: string;
  type: string;
  isDefault?: boolean;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  billing_details: {
    name?: string;
    email?: string;
  } | null;
  created: number;
}

interface PaymentsSectionProps {
  paymentMethods: PaymentMethod[];
  loadingPaymentMethods: boolean;
  showAddDialog: boolean;
  removingId: string | null;
  settingDefaultId: string | null;
  onShowAddDialog: (show: boolean) => void;
  onRemoveMethod: (id: string) => void;
  onSetDefault: (id: string) => void;
  onPaymentMethodAdded: () => void;
}

function formatExpiry(month: number, year: number) {
  return `${month.toString().padStart(2, '0')}/${year}`;
}

export function PaymentsSection({
  paymentMethods,
  loadingPaymentMethods,
  showAddDialog,
  removingId,
  settingDefaultId,
  onShowAddDialog,
  onRemoveMethod,
  onSetDefault,
  onPaymentMethodAdded,
}: PaymentsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payments</h2>
        <p className="text-sm text-gray-600 mb-6">Manage your payment methods</p>

        <div className="space-y-4 mb-6">
          {loadingPaymentMethods ? (
            <div className="text-center py-8 text-gray-600">Loading payment methods...</div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">No payment methods added yet</p>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors">
                <input type="radio" name="payment" checked={method.isDefault} onChange={() => !method.isDefault && onSetDefault(method.id)} disabled={settingDefaultId === method.id} className="w-4 h-4 text-teal-600 cursor-pointer" />
                <div className="flex-1">
                  {method.card ? (
                    <>
                      <p className="font-medium text-gray-900">
                        {method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)} ending in {method.card.last4}
                        {method.isDefault && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">Default</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">Expires {formatExpiry(method.card.expMonth, method.card.expYear)}</p>
                    </>
                  ) : (
                    <p className="font-medium text-gray-900">{method.type.charAt(0).toUpperCase() + method.type.slice(1)}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveMethod(method.id)}
                  disabled={removingId === method.id || method.isDefault}
                  className="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                  title={method.isDefault ? 'Cannot remove default payment method. Set another as default first.' : 'Remove payment method'}
                >
                  {removingId === method.id ? 'Removing...' : (<><Trash2 className="w-4 h-4" />Remove</>)}
                </button>
              </div>
            ))
          )}
        </div>

        <Dialog open={showAddDialog} onOpenChange={onShowAddDialog}>
          <DialogTrigger asChild>
            <button className="px-6 py-3 border-2 border-teal-600 text-teal-600 rounded-lg font-medium hover:bg-teal-50 transition-colors flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add new card
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>Add a new payment method to your account for quick and easy payments</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <AddPaymentMethodForm
                onSuccess={onPaymentMethodAdded}
                onCancel={() => onShowAddDialog(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
