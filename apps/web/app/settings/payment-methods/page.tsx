'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { theme } from '@/lib/theme';
import { HomeownerLayoutShell } from '../../dashboard/components/HomeownerLayoutShell';
import Link from 'next/link';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const response = await fetch('/api/payments/remove-method', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove payment method');
      }

      // Reload payment methods
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
      const response = await fetch('/api/payments/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default payment method');
      }

      // Reload payment methods to reflect the change
      await loadPaymentMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default payment method');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) return '💳';
    if (brandLower.includes('mastercard') || brandLower.includes('master')) return '💳';
    if (brandLower.includes('amex') || brandLower.includes('american')) return '💳';
    if (brandLower.includes('discover')) return '💳';
    return '💳';
  };

  const formatExpiry = (month: number, year: number) => {
    const monthStr = month.toString().padStart(2, '0');
    return `${monthStr}/${year.toString().slice(-2)}`;
  };

  if (loadingUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.backgroundSecondary }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <HomeownerLayoutShell
      currentPath="/settings/payment-methods"
      userName={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
      userEmail={user.email}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6]
      }}>
        {/* Header */}
        <div>
          <Link 
            href="/settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              color: theme.colors.textSecondary,
              textDecoration: 'none',
              marginBottom: theme.spacing[4],
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            <Icon name="arrowLeft" size={16} />
            Back to Settings
          </Link>
          <h1 style={{
            margin: 0,
            marginBottom: theme.spacing[1],
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Payment Methods
          </h1>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}>
            Manage your saved payment methods for quick and easy payments
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Add Payment Method Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <Button
            variant="primary"
            onClick={() => setShowAddDialog(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Icon name="plus" size={16} />
            Add Payment Method
          </Button>
        </div>

        {/* Payment Methods List */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: theme.spacing[12],
            color: theme.colors.textSecondary,
          }}>
            <div>Loading payment methods...</div>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[12],
            textAlign: 'center',
          }}>
            <Icon name="creditCard" size={64} color={theme.colors.textTertiary} style={{ marginBottom: theme.spacing[4] }} />
            <h2 style={{
              margin: 0,
              marginBottom: theme.spacing[2],
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              No Payment Methods
            </h2>
            <p style={{
              margin: 0,
              marginBottom: theme.spacing[4],
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              Add a payment method to make payments faster and easier
            </p>
            <Button
              variant="primary"
              onClick={() => setShowAddDialog(true)}
            >
              Add Payment Method
            </Button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
          }}>
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.border}`,
                  padding: theme.spacing[6],
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: theme.spacing[4],
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[4],
                  flex: 1,
                }}>
                  <div style={{
                    width: '56px',
                    height: '40px',
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.backgroundSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}>
                    {method.card ? getCardBrandIcon(method.card.brand) : '💳'}
                  </div>
                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[1],
                    }}>
                      {method.card ? (
                        <>
                          {method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)} •••• {method.card.last4}
                          {method.isDefault && (
                            <span style={{
                              marginLeft: theme.spacing[2],
                              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                              backgroundColor: '#D1FAE5',
                              color: '#065F46',
                              borderRadius: theme.borderRadius.sm,
                              fontSize: theme.typography.fontSize.xs,
                              fontWeight: theme.typography.fontWeight.semibold,
                            }}>
                              Default
                            </span>
                          )}
                        </>
                      ) : (
                        method.type.charAt(0).toUpperCase() + method.type.slice(1)
                      )}
                    </div>
                    {method.card && (
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}>
                        Expires {formatExpiry(method.card.expMonth, method.card.expYear)}
                        {method.billing_details?.name && ` • ${method.billing_details.name}`}
                      </div>
                    )}
                    {method.billing_details?.email && !method.card && (
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}>
                        {method.billing_details.email}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: theme.spacing[2],
                  alignItems: 'center',
                }}>
                  {!method.isDefault && (
                    <Button
                      variant="outline"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={settingDefaultId === method.id}
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                      }}
                    >
                      {settingDefaultId === method.id ? 'Setting...' : 'Set as Default'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveMethod(method.id)}
                    disabled={removingId === method.id || method.isDefault}
                    style={{
                      color: method.isDefault ? theme.colors.textTertiary : theme.colors.error,
                      borderColor: method.isDefault ? theme.colors.border : theme.colors.error,
                      cursor: method.isDefault ? 'not-allowed' : 'pointer',
                    }}
                    title={method.isDefault ? 'Cannot remove default payment method. Set another as default first.' : 'Remove payment method'}
                  >
                    {removingId === method.id ? 'Removing...' : 'Remove'}
                  </Button>
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
    </HomeownerLayoutShell>
  );
}

