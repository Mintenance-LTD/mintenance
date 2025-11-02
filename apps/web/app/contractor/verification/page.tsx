'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { PageLayout, PageHeader } from '@/components/ui/PageLayout';
import { Card } from '@/components/ui/Card.unified';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge as StatusChip } from '@/components/ui/Badge.unified';

interface VerificationStatus {
  hasBusinessAddress: boolean;
  hasLicenseNumber: boolean;
  hasGeolocation: boolean;
  hasCompanyName: boolean;
  isFullyVerified: boolean;
  data: any;
}

type Feedback = { tone: 'success' | 'error'; message: string } | null;

const REQUIRED_STEPS = [
  { key: 'hasCompanyName', label: 'Business name' },
  { key: 'hasLicenseNumber', label: 'Trade licence' },
  { key: 'hasBusinessAddress', label: 'Business address' },
  { key: 'hasGeolocation', label: 'Map location' },
] as const;

export default function ContractorVerificationPage() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [companyName, setCompanyName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');

  useEffect(() => {
    document.title = 'Verification | Mintenance';
  }, []);

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const completedSteps = useMemo(() => {
    if (!status) return 0;
    return REQUIRED_STEPS.reduce((count, step) => (status[step.key] ? count + 1 : count), 0);
  }, [status]);

  const progress = Math.round((completedSteps / REQUIRED_STEPS.length) * 100);

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contractor/verification');
      if (!response.ok) {
        throw new Error('Unable to load verification status.');
      }

      const data = await response.json();
      setStatus(data);
      if (data.data) {
        setCompanyName(data.data.company_name || '');
        setBusinessAddress(data.data.business_address || data.data.address || '');
        setLicenseNumber(data.data.license_number || '');
        setYearsExperience(data.data.years_experience || 0);
        setInsuranceProvider(data.data.insurance_provider || '');
        setInsurancePolicyNumber(data.data.insurance_policy_number || '');
        setInsuranceExpiryDate(data.data.insurance_expiry_date || '');
      }
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error.message || 'Failed to load verification status.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/contractor/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          businessAddress,
          licenseNumber,
          licenseType,
          yearsExperience,
          insuranceProvider,
          insurancePolicyNumber,
          insuranceExpiryDate,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit verification.');
      }

      setFeedback({
        tone: 'success',
        message: result.geocoded
          ? 'Verification submitted. Your address is now visible to homeowners on the map.'
          : 'Verification submitted. Address saved without geocoding.',
      });
      loadVerificationStatus();
    } catch (error: any) {
      setFeedback({ tone: 'error', message: error.message || 'Failed to submit verification.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <PageHeader title="Verification" description="Confirm your business details to build homeowner trust." />
        <Card>
          <Card.Content>
            <div style={{ padding: theme.spacing[6], textAlign: 'center', color: theme.colors.textSecondary }}>
              Loading verification information...
            </div>
          </Card.Content>
        </Card>
      </PageLayout>
    );
  }

  if (!status) {
    return (
      <PageLayout>
        <PageHeader title="Verification" description="Confirm your business details to build homeowner trust." />
        <Card>
          <Card.Content>
            <div style={{ padding: theme.spacing[6], textAlign: 'center', color: theme.colors.textSecondary }}>
              We could not load your verification data. Please try again shortly.
            </div>
          </Card.Content>
        </Card>
      </PageLayout>
    );
  }

  const stepCompletion = (key: typeof REQUIRED_STEPS[number]['key']) => Boolean(status[key]);

  return (
    <PageLayout
      sidebar={
        <>
          <Card>
            <Card.Header>
              <Card.Title>Verification progress</Card.Title>
              <Card.Description>Complete every step to unlock full visibility.</Card.Description>
            </Card.Header>
            <Card.Content>
              <ProgressBar
                value={progress}
                tone={status.isFullyVerified ? 'success' : progress >= 50 ? 'warning' : 'neutral'}
              />
              <div style={{ marginTop: theme.spacing[4], display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
                {REQUIRED_STEPS.map((step) => (
                  <div
                    key={step.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: theme.colors.backgroundSecondary,
                    }}
                  >
                    <StatusChip
                      variant={stepCompletion(step.key) ? 'success' : 'neutral'}
                      withDot
                    >
                      {step.label}
                    </StatusChip>
                    <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                      {stepCompletion(step.key) ? 'Complete' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Why verification matters</Card.Title>
            </Card.Header>
            <Card.Content>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'flex-start' }}>
                  <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
                  <p style={{ margin: 0, fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    Verified contractors stay visible on the homeowner radar, even when logged out.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'flex-start' }}>
                  <Icon name="badge" size={16} color={theme.colors.textSecondary} />
                  <p style={{ margin: 0, fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    Completed profiles receive a trust badge and higher placement in search.
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </>
      }
    >
      <PageHeader
        title="Verification"
        description="Add official details so homeowners can trust and contact you instantly."
      />

      {feedback && (
        <NotificationBanner
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <Card>
        <Card.Header>
          <Card.Title>Business details</Card.Title>
          <Card.Description>We only use this information to build trust and show your business in the right location.</Card.Description>
        </Card.Header>
        <Card.Content>
          <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
          }}
        >
          <div style={{ display: 'grid', gap: theme.spacing[4] }}>
            <Input
              label="Company name *"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
            />
            <Input
              label="Business address *"
              value={businessAddress}
              onChange={(event) => setBusinessAddress(event.target.value)}
              placeholder="Street, city, postcode"
              required
            />
            <Input
              label="Trade licence number *"
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              required
            />
            <Input
              label="Licence type"
              value={licenseType}
              onChange={(event) => setLicenseType(event.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: theme.spacing[4] }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                Years experience
              </span>
              <input
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(event) => setYearsExperience(Number(event.target.value))}
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  fontSize: theme.typography.fontSize.base,
                }}
              />
            </label>
            <Input
              label="Insurance provider"
              value={insuranceProvider}
              onChange={(event) => setInsuranceProvider(event.target.value)}
            />
            <Input
              label="Policy number"
              value={insurancePolicyNumber}
              onChange={(event) => setInsurancePolicyNumber(event.target.value)}
            />
            <Input
              label="Insurance expiry"
              type="date"
              value={insuranceExpiryDate}
              onChange={(event) => setInsuranceExpiryDate(event.target.value)}
            />
          </div>

          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[3] }}>
            <Button variant="ghost" type="button" onClick={loadVerificationStatus} disabled={submitting}>
              Reset
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit verification'}
            </Button>
          </footer>
        </form>
        </Card.Content>
      </Card>
    </PageLayout>
  );
}

