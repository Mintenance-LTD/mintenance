'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { theme } from '@/lib/theme';
import { DisputeDocumentationService } from '@/lib/services/disputes/DisputeDocumentationService';
import { Loader2 } from 'lucide-react';

function CreateDisputeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const escrowId = searchParams.get('escrowId');
  const { user, loading } = useCurrentUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    evidence: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const steps = DisputeDocumentationService.getProcessSteps();
  const resolutionTimes = DisputeDocumentationService.getResolutionTimes();

  const handleSubmit = async () => {
    if (!escrowId) {
      setError('Escrow ID is required');
      return;
    }

    if (!formData.reason.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/disputes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId,
          reason: formData.reason,
          description: formData.description,
          evidence: formData.evidence,
          priority: formData.priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create dispute');
      }

      router.push(`/disputes/${data.disputeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: theme.spacing[6],
    }}>
      <h1 style={{
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        marginBottom: theme.spacing[6],
      }}>
        Create Dispute
      </h1>

      {/* Process Steps */}
      <Card style={{ marginBottom: theme.spacing[6], padding: theme.spacing[6] }}>
        <h2 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          marginBottom: theme.spacing[4],
        }}>
          Dispute Process
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {steps.map((step) => (
            <div key={step.step} style={{
              display: 'flex',
              gap: theme.spacing[4],
              padding: theme.spacing[4],
              backgroundColor: currentStep === step.step ? '#F3F4F6' : 'transparent',
              borderRadius: '8px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: currentStep >= step.step ? '#3B82F6' : '#E5E7EB',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {step.step}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  marginBottom: theme.spacing[1],
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}>
                  {step.description}
                </p>
                <span style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textTertiary,
                }}>
                  Estimated: {step.estimatedTime}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Dispute Form */}
      <Card style={{ padding: theme.spacing[6] }}>
        <h2 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          marginBottom: theme.spacing[4],
        }}>
          Dispute Details
        </h2>

        {error && (
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: '#FEE2E2',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            marginBottom: theme.spacing[4],
            color: '#991B1B',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing[2],
            }}>
              Reason *
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: theme.typography.fontSize.base,
              }}
            >
              <option value="">Select a reason</option>
              <option value="incomplete_work">Incomplete Work</option>
              <option value="poor_quality">Poor Quality</option>
              <option value="damage">Property Damage</option>
              <option value="not_as_described">Not As Described</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing[2],
            }}>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide a detailed description of the issue..."
              rows={6}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: theme.typography.fontSize.base,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing[2],
            }}>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: theme.typography.fontSize.base,
              }}
            >
              <option value="low">Low - {resolutionTimes.low}</option>
              <option value="medium">Medium - {resolutionTimes.medium}</option>
              <option value="high">High - {resolutionTimes.high}</option>
              <option value="critical">Critical - {resolutionTimes.critical}</option>
            </select>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[1],
            }}>
              Estimated resolution time: {resolutionTimes[formData.priority]}
            </p>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing[2],
            }}>
              Evidence (Photos/Documents)
            </label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => {
                // Handle file upload (simplified)
                const files = Array.from(e.target.files || []);
                // In production, upload to storage and get URLs
                setFormData({ ...formData, evidence: files.map(f => f.name) });
              }}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
            />
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[1],
            }}>
              Upload photos or documents that support your dispute
            </p>
          </div>

          <div style={{ display: 'flex', gap: theme.spacing[4], marginTop: theme.spacing[4] }}>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function CreateDisputePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CreateDisputeContent />
    </Suspense>
  );
}
