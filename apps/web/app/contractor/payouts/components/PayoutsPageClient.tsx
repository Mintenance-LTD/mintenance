'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { theme } from '@/lib/theme';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface PayoutAccount {
  id: string;
  contractor_id: string;
  account_type: 'bank_account' | 'paypal' | 'venmo' | 'zelle';
  account_holder_name: string;
  account_number: string | null;
  routing_number: string | null;
  paypal_email: string | null;
  venmo_username: string | null;
  zelle_email: string | null;
  is_primary: boolean | null;
  is_verified: boolean | null;
  created_at: string;
  updated_at: string;
}

interface Contractor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company_name: string | null;
  profile_image_url: string | null;
}

interface PayoutsPageClientProps {
  contractor: Contractor | null;
  initialPayoutAccounts: PayoutAccount[];
  userId: string;
  userEmail: string;
}

export function PayoutsPageClient({
  contractor,
  initialPayoutAccounts,
  userId,
  userEmail,
}: PayoutsPageClientProps) {
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>(initialPayoutAccounts);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const {
    csrfToken,
    loading: csrfLoading,
    error: csrfError,
  } = useCSRF();

  // Inject spin animation keyframes
  useEffect(() => {
    const styleId = 'payout-spin-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Fix duplicate sidebar issue - remove nested ContractorLayoutShell if present
    // This happens when a layout is accidentally nested inside the main content
    const fixDuplicateSidebar = () => {
      const sidebars = document.querySelectorAll('aside[role="complementary"], aside.complementary');
      if (sidebars.length > 1) {
        // Find the nested sidebar (one that's inside a main element)
        const mains = document.querySelectorAll('main');
        if (mains.length > 0) {
          const firstMain = mains[0];
          const nestedSidebar = firstMain.querySelector('aside');
          
          if (nestedSidebar) {
            // Find the parent div that contains this nested sidebar (the duplicate ContractorLayoutShell)
            const nestedLayoutDiv = nestedSidebar.closest('div[style*="min-height: 100vh"]');
            
            if (nestedLayoutDiv && nestedLayoutDiv.parentElement === firstMain) {
              // Extract the actual content from the nested layout
              const contentDiv = nestedLayoutDiv.querySelector('div:has(header)');
              if (contentDiv) {
                const actualMain = contentDiv.querySelector('main');
                if (actualMain) {
                  // Replace the nested layout div with just the actual content
                  const actualContent = Array.from(actualMain.children);
                  nestedLayoutDiv.replaceWith(...actualContent);
                }
              }
            }
          }
        }
      }
    };

    // Run immediately and also after a short delay to catch any delayed rendering
    fixDuplicateSidebar();
    setTimeout(fixDuplicateSidebar, 100);
    setTimeout(fixDuplicateSidebar, 500);
  }, []);

  const handleSetupStripeConnect = async () => {
    if (!csrfToken) {
      setError('Security token not loaded. Please refresh the page and try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/contractor/payout/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set up payout account');
      }

      // Redirect to Stripe onboarding
      if (data.accountUrl) {
        window.location.href = data.accountUrl;
      } else {
        throw new Error('No onboarding URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up payout account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'bank_account':
        return '🏦';
      case 'paypal':
        return '💳';
      case 'venmo':
        return '💸';
      case 'zelle':
        return '💵';
      default:
        return '💳';
    }
  };

  const getAccountDisplayInfo = (account: PayoutAccount) => {
    switch (account.account_type) {
      case 'bank_account':
        return {
          label: 'Bank Account',
          details: account.account_number
            ? `****${account.account_number.slice(-4)}`
            : 'Account number not available',
          name: account.account_holder_name,
        };
      case 'paypal':
        return {
          label: 'PayPal',
          details: account.paypal_email || 'No email on file',
          name: account.account_holder_name,
        };
      case 'venmo':
        return {
          label: 'Venmo',
          details: account.venmo_username || 'No username on file',
          name: account.account_holder_name,
        };
      case 'zelle':
        return {
          label: 'Zelle',
          details: account.zelle_email || 'No email on file',
          name: account.account_holder_name,
        };
      default:
        return {
          label: account.account_type,
          details: 'No details available',
          name: account.account_holder_name,
        };
    }
  };

  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: theme.spacing[6],
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[6]
    }}>
        {/* Subtitle - Layout header already shows "Payouts" */}
        <div>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}>
            Manage your payout accounts to receive payments from completed jobs
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* CSRF Token Load Error */}
        {csrfError && !error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Security protection could not be initialized. Please refresh the page to retry.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* Setup Stripe Connect Button */}
        {payoutAccounts.length === 0 && (
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[8],
            textAlign: 'center',
          }}>
            <Icon name="bank" size={64} color={theme.colors.textTertiary} style={{ marginBottom: theme.spacing[4] }} />
            <h2 style={{
              margin: 0,
              marginBottom: theme.spacing[2],
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              No Payout Account Setup
            </h2>
            <p style={{
              margin: 0,
              marginBottom: theme.spacing[4],
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              Set up your payout account to receive payments from completed jobs. We use Stripe Connect for secure payment processing.
            </p>
            <Button
              variant="primary"
              onClick={handleSetupStripeConnect}
              disabled={isSubmitting || csrfLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                margin: '0 auto',
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Setting up...
                </>
              ) : (
                <>
                  <Icon name="plus" size={16} />
                  Set Up Payout Account
                </>
              )}
            </Button>
          </div>
        )}

        {/* Existing Payout Accounts */}
        {payoutAccounts.length > 0 && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}>
                Your Payout Accounts ({payoutAccounts.length})
              </h2>
              <Button
                variant="secondary"
                onClick={handleSetupStripeConnect}
                disabled={isSubmitting || csrfLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}
              >
                <Icon name="plus" size={16} />
                Add Account
              </Button>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[4],
            }}>
              {payoutAccounts.map((account) => {
                const accountInfo = getAccountDisplayInfo(account);
                return (
                  <div
                    key={account.id}
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
                        height: '56px',
                        borderRadius: theme.borderRadius.lg,
                        backgroundColor: theme.colors.backgroundSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                      }}>
                        {getAccountTypeIcon(account.account_type)}
                      </div>
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[2],
                          marginBottom: theme.spacing[1],
                        }}>
                          <div style={{
                            fontSize: theme.typography.fontSize.base,
                            fontWeight: theme.typography.fontWeight.semibold,
                            color: theme.colors.textPrimary,
                          }}>
                            {accountInfo.label}
                          </div>
                          {account.is_primary && (
                            <span style={{
                              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                              borderRadius: theme.borderRadius.full,
                              backgroundColor: '#DBEAFE',
                              color: '#1E40AF',
                              fontSize: theme.typography.fontSize.xs,
                              fontWeight: theme.typography.fontWeight.semibold,
                            }}>
                              Primary
                            </span>
                          )}
                          {account.is_verified ? (
                            <span style={{
                              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                              borderRadius: theme.borderRadius.full,
                              backgroundColor: '#D1FAE5',
                              color: '#065F46',
                              fontSize: theme.typography.fontSize.xs,
                              fontWeight: theme.typography.fontWeight.semibold,
                              display: 'flex',
                              alignItems: 'center',
                              gap: theme.spacing[1],
                            }}>
                              <Icon name="checkCircle" size={12} color="#10B981" />
                              Verified
                            </span>
                          ) : (
                            <span style={{
                              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                              borderRadius: theme.borderRadius.full,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontSize: theme.typography.fontSize.xs,
                              fontWeight: theme.typography.fontWeight.semibold,
                            }}>
                              Pending Verification
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary,
                          marginBottom: theme.spacing[1],
                        }}>
                          {accountInfo.name}
                        </div>
                        <div style={{
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textTertiary,
                        }}>
                          {accountInfo.details}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Information Card */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-5 w-5 text-blue-600" />
          <div>
            <h3 style={{
              margin: 0,
              marginBottom: theme.spacing[2],
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: '#1E40AF',
            }}>
              About Payout Accounts
            </h3>
            <AlertDescription className="text-blue-700">
              <ul style={{
                margin: 0,
                paddingLeft: theme.spacing[5],
                fontSize: theme.typography.fontSize.sm,
                lineHeight: 1.6,
              }}>
                <li>Payments are processed securely through Stripe Connect</li>
                <li>Funds from completed jobs are transferred to your payout account</li>
                <li>You can set a primary payout account for automatic transfers</li>
                <li>Bank account verification may take 1-2 business days</li>
              </ul>
            </AlertDescription>
          </div>
        </Alert>
      </div>
  );
}

