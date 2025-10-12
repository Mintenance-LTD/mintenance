'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { NotificationBanner } from '@/components/ui/NotificationBanner';

export function CardEditorClient({ profile: initialProfile }: { profile: any }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialProfile.company_name || '');
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [hourlyRate, setHourlyRate] = useState(initialProfile.hourly_rate || '');
  const [yearsExperience, setYearsExperience] = useState(initialProfile.years_experience || '');
  const [availability, setAvailability] = useState(initialProfile.is_available ? 'available' : 'busy');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/contractor/update-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          bio,
          hourlyRate: parseFloat(hourlyRate),
          yearsExperience: parseInt(yearsExperience),
          isAvailable: availability === 'available',
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setFeedback({ tone: 'success', message: 'Discovery card updated successfully.' });
      setTimeout(() => router.push('/contractor/profile'), 600);
    } catch (error) {
      setFeedback({ tone: 'error', message: 'Failed to save changes. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: theme.spacing[6] }}>
      {feedback && (
        <NotificationBanner
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
          style={{ marginBottom: theme.spacing[4] }}
        />
      )}

      <h1 style={{
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        marginBottom: theme.spacing[6],
      }}>
        Edit Discovery Card
      </h1>

      {/* Form */}
      <div style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
        marginBottom: theme.spacing[6],
        border: `1px solid ${theme.colors.border}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <Input
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Business Name"
          />

          <Textarea
            label="Professional Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your expertise and what sets you apart..."
            rows={4}
            maxLength={500}
          />
          <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'right' }}>
            {bio.length}/500 characters
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[4] }}>
            <Input
              label="Hourly Rate (£)"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="75"
              min="0"
            />
            <Input
              label="Years Experience"
              type="number"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="10"
              min="0"
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              marginBottom: theme.spacing[2],
            }}>
              Availability
            </label>
            <div style={{ display: 'flex', gap: theme.spacing[3] }}>
              {(['available', 'busy'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setAvailability(status)}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    backgroundColor: availability === status ? (status === 'available' ? theme.colors.success : theme.colors.error) : theme.colors.surface,
                    color: availability === status ? 'white' : theme.colors.text,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.md,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing[8],
          marginBottom: theme.spacing[6],
          border: `2px solid ${theme.colors.primary}`,
          textAlign: 'center',
        }}>
          <h3 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing[2] }}>
            {companyName || 'Your Company'}
          </h3>
          <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing[4] }}>
            {bio || 'Your professional bio...'}
          </p>
          <div style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.primary }}>
            £{hourlyRate || '0'}/hr
          </div>
          <div style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary, marginTop: theme.spacing[2] }}>
            {yearsExperience || '0'} years experience
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: theme.spacing[4], justifyContent: 'space-between' }}>
        <Button variant="secondary" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? 'Hide' : 'Show'} Preview
        </Button>
        <div style={{ display: 'flex', gap: theme.spacing[3] }}>
          <Button variant="secondary" onClick={() => router.back()} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Discovery Card'}
          </Button>
        </div>
      </div>
    </div>
  );
}

