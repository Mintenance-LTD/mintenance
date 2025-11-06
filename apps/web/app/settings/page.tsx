'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { theme } from '@/lib/theme';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { PrivacyPolicyContent } from '@/components/settings/PrivacyPolicyContent';
import { TermsOfServiceContent } from '@/components/settings/TermsOfServiceContent';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
      currentPath="/settings"
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
          <h1 style={{
            margin: 0,
            marginBottom: theme.spacing[1],
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Settings
          </h1>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}>
            Manage your account settings and preferences
          </p>
        </div>

        {/* Settings Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: theme.spacing[6],
        }}>
          {/* Profile Information Card */}
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
              }}>
                {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                }}>
                  Profile Information
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  Your account details
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[3],
              paddingTop: theme.spacing[4],
              borderTop: `1px solid ${theme.colors.border}`,
            }}>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}>
                  Name
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                }}>
                  {user.first_name} {user.last_name}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}>
                  Email
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  {user.email}
                  {user.email_verified && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: theme.spacing[1],
                      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                      backgroundColor: '#10B98115',
                      color: '#10B981',
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}>
                      <Icon name="check" size={12} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}>
                  Account Type
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  textTransform: 'capitalize',
                }}>
                  {user.role}
                </div>
              </div>
            </div>

            <Link href="/profile" style={{ textDecoration: 'none', marginTop: theme.spacing[2] }}>
              <Button variant="primary" style={{ width: '100%' }}>
                <Icon name="user" size={16} style={{ marginRight: theme.spacing[2] }} />
                Edit Profile
              </Button>
            </Link>
          </div>

          {/* Account Actions Card */}
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.borderRadius.lg,
                backgroundColor: theme.colors.backgroundSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.primary,
              }}>
                <Icon name="settings" size={24} />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                }}>
                  Account Actions
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  Manage your account
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}>
              <Link
                href="/settings/payment-methods"
                style={{
                  width: '100%',
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }}
              >
                <Icon name="creditCard" size={16} />
                <span>Payment Methods</span>
              </Link>
              <button
                onClick={() => setShowPrivacyModal(true)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }}
              >
                <Icon name="shield" size={16} />
                <span>Privacy Policy</span>
              </button>
              <button
                onClick={() => setShowTermsModal(true)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }}
              >
                <Icon name="document" size={16} />
                <span>Terms of Service</span>
              </button>
            </div>
          </div>

          {/* Security Card */}
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.borderRadius.lg,
                backgroundColor: theme.colors.backgroundSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.primary,
              }}>
                <Icon name="lock" size={24} />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                }}>
                  Security
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  Protect your account
                </p>
              </div>
            </div>

            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              lineHeight: 1.6,
            }}>
              Contact support to change your password or manage your security settings.
            </div>

            <Link href="/help" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" style={{ width: '100%' }}>
                <Icon name="help" size={16} style={{ marginRight: theme.spacing[2] }} />
                Contact Support
              </Button>
            </Link>
          </div>
        </div>

        {/* Privacy Policy Modal */}
        <Modal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          title="Privacy Policy"
          maxWidth={900}
        >
          <PrivacyPolicyContent />
        </Modal>

        {/* Terms of Service Modal */}
        <Modal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          title="Terms of Service"
          maxWidth={900}
        >
          <TermsOfServiceContent />
        </Modal>
      </div>
    </HomeownerLayoutShell>
  );
}
