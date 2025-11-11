'use client';

import React from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { theme } from '@/lib/theme';
import { AlertCircle, Download, Trash2, Shield, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface GDPRPreferences {
  dataProcessing: boolean;
  marketing: boolean;
  analytics: boolean;
  dataSharing: boolean;
}

interface ContractorDataPrivacyProps {
  contractorId: string;
}

export function ContractorDataPrivacy({ contractorId }: ContractorDataPrivacyProps) {
  const { user } = useCurrentUser();
  const [preferences, setPreferences] = React.useState<GDPRPreferences>({
    dataProcessing: true, // Required for service
    marketing: false,
    analytics: false,
    dataSharing: false,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    // Load saved preferences
    if (user) {
      fetch('/api/user/gdpr-preferences')
        .then(res => res.json())
        .then(data => {
          if (data.preferences) {
            setPreferences(data.preferences);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handlePreferenceChange = async (key: keyof GDPRPreferences, value: boolean) => {
    if (key === 'dataProcessing' && !value) {
      setMessage({ type: 'error', text: 'Data processing is required to use our service.' });
      return;
    }

    setIsLoading(true);
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const response = await fetch('/api/user/gdpr-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: newPreferences }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setMessage({ type: 'success', text: 'Preferences saved successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' });
      setPreferences(preferences); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/export-data', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mintenance-contractor-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowExportDialog(false);
      setMessage({ type: 'success', text: 'Data export downloaded successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Redirect to login after account deletion
      window.location.href = '/login?deleted=true';
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account. Please contact support.' });
      setIsLoading(false);
    }
  };

  return (
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
          backgroundColor: '#DBEAFE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Shield className="h-6 w-6" style={{ color: '#1E40AF' }} />
        </div>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Data Privacy & GDPR
          </h2>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            Control how your data is used (UK GDPR & EU GDPR compliant)
          </p>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
        paddingTop: theme.spacing[4],
        borderTop: `1px solid ${theme.colors.border}`,
      }}>
        {/* Data Processing Consent */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing[3],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[1],
            }}>
              Essential Data Processing
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Required to provide our service (cannot be disabled)
            </div>
          </div>
          <Switch
            checked={preferences.dataProcessing}
            disabled={true}
            onCheckedChange={() => {}}
          />
        </div>

        {/* Marketing Consent */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing[3],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[1],
            }}>
              Marketing Communications
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Receive emails about new features, promotions, and updates
            </div>
          </div>
          <Switch
            checked={preferences.marketing}
            disabled={isLoading}
            onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
          />
        </div>

        {/* Analytics Consent */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing[3],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[1],
            }}>
              Analytics & Performance
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Help us improve our service with usage analytics
            </div>
          </div>
          <Switch
            checked={preferences.analytics}
            disabled={isLoading}
            onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
          />
        </div>

        {/* Data Sharing Consent */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing[3],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[1],
            }}>
              Data Sharing with Partners
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Share anonymized data with trusted partners for service improvement
            </div>
          </div>
          <Switch
            checked={preferences.dataSharing}
            disabled={isLoading}
            onCheckedChange={(checked) => handlePreferenceChange('dataSharing', checked)}
          />
        </div>
      </div>

      {/* GDPR Rights */}
      <div style={{
        paddingTop: theme.spacing[4],
        borderTop: `1px solid ${theme.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[3],
      }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          margin: 0,
        }}>
          Your GDPR Rights
        </h3>
        <p style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          margin: 0,
        }}>
          As a UK/EU resident, you have the right to access, export, and delete your personal data.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[2],
        }}>
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={isLoading}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export My Data
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isLoading}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              borderColor: theme.colors.error,
              color: theme.colors.error,
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete My Account
          </Button>
        </div>
      </div>

      {/* Export Data Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Your Data</DialogTitle>
            <DialogDescription>
              We'll prepare a complete export of all your personal data including profile, jobs, bids, reviews, and payment information. This may take a few moments.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', gap: theme.spacing[3], marginTop: theme.spacing[4] }}>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExportData}
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              {isLoading ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Your Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently deleted in accordance with GDPR requirements.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" style={{ marginTop: theme.spacing[4] }}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will permanently delete your account, all jobs, bids, reviews, portfolio, and associated data. 
              You may want to export your data first.
            </AlertDescription>
          </Alert>
          <div style={{ display: 'flex', gap: theme.spacing[3], marginTop: theme.spacing[4] }}>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              {isLoading ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

