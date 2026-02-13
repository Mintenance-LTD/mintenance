'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, CreditCard, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import { AddPaymentMethodForm } from './components/AddPaymentMethodForm';

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

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      loadPaymentMethods();
    }
  }, [user]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/payments/methods');

      if (!response.ok) {
        throw new Error('Failed to load payment methods');
      }

      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      setRemovingId(methodId);
      const csrfResponse = await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
      const { token: csrfToken } = csrfResponse.ok ? await csrfResponse.json() : { token: '' };
      if (csrfToken) await new Promise(resolve => setTimeout(resolve, 50));

      const response = await fetch('/api/payments/remove-method', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove payment method');
      }

      await loadPaymentMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setSettingDefaultId(methodId);
      setError('');
      const csrfResponse = await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
      const { token: csrfToken } = csrfResponse.ok ? await csrfResponse.json() : { token: '' };
      if (csrfToken) await new Promise(resolve => setTimeout(resolve, 50));

      const response = await fetch('/api/payments/set-default', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default payment method');
      }

      await loadPaymentMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default payment method');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to Settings */}
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Settings</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Methods</h1>
          <p className="text-gray-600">Manage your saved payment methods for quick and easy payments</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Add Payment Method Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Payment Method
          </button>
        </div>

        {/* Payment Methods List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Loading payment methods...</p>
            </div>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Methods</h3>
              <p className="text-gray-500 mb-6 max-w-sm">
                No payment methods have been added yet. Add one to continue.
              </p>
              <button
                onClick={() => setShowAddDialog(true)}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Add Payment Method
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between gap-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {method.card
                          ? `${method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)} **** ${method.card.last4}`
                          : method.type.charAt(0).toUpperCase() + method.type.slice(1)}
                      </span>
                      {method.isDefault && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    {method.card && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Expires {formatExpiry(method.card.expMonth, method.card.expYear)}
                        {method.billing_details?.name && ` \u00b7 ${method.billing_details.name}`}
                      </p>
                    )}
                    {method.billing_details?.email && !method.card && (
                      <p className="text-sm text-gray-500 mt-0.5">{method.billing_details.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      disabled={settingDefaultId === method.id}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <Star className="w-4 h-4" />
                      {settingDefaultId === method.id ? 'Setting...' : 'Set Default'}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveMethod(method.id)}
                    disabled={removingId === method.id || method.isDefault}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      method.isDefault
                        ? 'text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'text-red-600 border border-red-200 hover:bg-red-50'
                    }`}
                    title={method.isDefault ? 'Cannot remove default payment method. Set another as default first.' : 'Remove payment method'}
                  >
                    <Trash2 className="w-4 h-4" />
                    {removingId === method.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Payment Method Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>
                Add a new payment method to your account for quick and easy payments
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <AddPaymentMethodForm
                onSuccess={() => {
                  setShowAddDialog(false);
                  setError('');
                  loadPaymentMethods();
                }}
                onCancel={() => {
                  setShowAddDialog(false);
                  setError('');
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
