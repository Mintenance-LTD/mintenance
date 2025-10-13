'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      {feedback && (
        <NotificationBanner
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <header>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          Discovery Card Editor
        </h1>
        <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
          Create your professional business card that appears in contractor discovery searches.
        </p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: theme.spacing[6],
        alignItems: 'start',
      }}>
        {/* Form Section */}
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          padding: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[5],
        }}>
          <header style={{ borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: theme.spacing[4] }}>
            <h2 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              margin: 0,
              marginBottom: theme.spacing[1],
            }}>
              Card Details
            </h2>
            <p style={{ margin: 0, fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              Fill out the information that will appear on your discovery card
            </p>
          </header>

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
            rows={5}
            maxLength={500}
          />
          <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'right', marginTop: `-${theme.spacing[3]}` }}>
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
              marginBottom: theme.spacing[3],
            }}>
              Availability Status
            </label>
            <div style={{ display: 'flex', gap: theme.spacing[3] }}>
              {(['available', 'busy'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setAvailability(status)}
                  style={{
                    flex: 1,
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: availability === status
                      ? (status === 'available' ? theme.colors.success : theme.colors.error)
                      : theme.colors.backgroundSecondary,
                    color: availability === status ? '#FFFFFF' : theme.colors.textSecondary,
                    border: `1px solid ${availability === status
                      ? (status === 'available' ? theme.colors.success : theme.colors.error)
                      : theme.colors.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    transition: 'all 0.2s',
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: theme.spacing[3], paddingTop: theme.spacing[4], borderTop: `1px solid ${theme.colors.border}` }}>
            <Button variant="outline" onClick={() => router.back()} disabled={isSaving} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving} style={{ flex: 1 }}>
              {isSaving ? 'Saving...' : 'Save Card'}
            </Button>
          </div>
        </div>

        {/* Live Preview Section */}
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          padding: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
          position: 'sticky',
          top: theme.spacing[4],
        }}>
          <header style={{ borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: theme.spacing[4], marginBottom: theme.spacing[5] }}>
            <h2 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              margin: 0,
              marginBottom: theme.spacing[1],
            }}>
              Live Preview
            </h2>
            <p style={{ margin: 0, fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              How your card will appear to homeowners
            </p>
          </header>

          <div style={{
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: '16px',
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  margin: 0,
                  marginBottom: theme.spacing[2],
                  color: theme.colors.textPrimary,
                }}>
                  {companyName || 'Your Company Name'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                  <Icon name="briefcase" size={14} color={theme.colors.textSecondary} />
                  <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    {yearsExperience || '0'} years experience
                  </span>
                </div>
              </div>
              <StatusBadge
                status={availability === 'available' ? 'active' : 'inactive'}
                size="sm"
              />
            </div>

            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              lineHeight: 1.6,
              minHeight: '60px',
            }}>
              {bio || 'Your professional bio will appear here. Describe your expertise and what sets you apart from other contractors.'}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: theme.spacing[4],
              borderTop: `1px solid ${theme.colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: theme.spacing[1] }}>
                <span style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.primary,
                }}>
                  £{hourlyRate || '0'}
                </span>
                <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                  /hour
                </span>
              </div>
              <Button variant="primary" size="sm" disabled>
                View Profile
              </Button>
            </div>
          </div>

          <div style={{
            marginTop: theme.spacing[4],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <Icon name="info" size={16} color={theme.colors.info} />
              <p style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                lineHeight: 1.5,
              }}>
                This card appears in search results when homeowners browse contractors in your area
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

