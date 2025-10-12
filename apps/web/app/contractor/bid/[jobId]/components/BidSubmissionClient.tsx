'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface BidSubmissionClientProps {
  job: {
    id: string;
    title: string;
    description: string;
    budget?: string;
    location?: string;
    category?: string;
    createdAt?: string;
    postedBy?: { name?: string };
  };
}

type Feedback = { type: 'success' | 'error'; message: string } | null;

export function BidSubmissionClient({ job }: BidSubmissionClientProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);

  const budgetLabel = useMemo(() => {
    if (!job.budget) return 'Budget TBD';
    const parsed = parseFloat(job.budget);
    if (Number.isNaN(parsed)) return 'Budget TBD';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(parsed);
  }, [job.budget]);

  const handleSubmit = async () => {
    if (!amount || !description) {
      setFeedback({ type: 'error', message: 'Please add a bid amount and short proposal.' });
      return;
    }

    const bidAmount = parseFloat(amount);
    if (Number.isNaN(bidAmount) || bidAmount <= 0) {
      setFeedback({ type: 'error', message: 'Enter a valid bid amount greater than zero.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const response = await fetch('/api/contractor/submit-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          amount: bidAmount,
          description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit bid.');
      }

      setFeedback({ type: 'success', message: 'Your bid has been submitted.' });
      setTimeout(() => router.push('/jobs'), 1200);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to submit bid.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            Submit bid
          </h1>
          <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Review the project details and include your timeline, pricing, and any relevant experience.
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </header>

      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            borderRadius: '16px',
            border: `1px solid ${
              feedback.type === 'success' ? theme.colors.success : theme.colors.error
            }`,
            backgroundColor:
              feedback.type === 'success'
                ? 'rgba(52, 199, 89, 0.08)'
                : 'rgba(255, 59, 48, 0.08)',
            padding: theme.spacing[4],
          }}
        >
          <Icon
            name={feedback.type === 'success' ? 'checkCircle' : 'alert'}
            size={20}
            color={feedback.type === 'success' ? theme.colors.success : theme.colors.error}
          />
          <span style={{ fontSize: theme.typography.fontSize.sm }}>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            aria-label="Dismiss message"
          >
            <Icon name="x" size={16} color={theme.colors.textSecondary} />
          </button>
        </div>
      )}

      <section
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          border: `1px solid ${theme.colors.border}`,
          padding: theme.spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
          <div>
            <h2 style={{ margin: 0, fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.semibold }}>
              {job.title}
            </h2>
            <p style={{ margin: 0, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              {job.category || 'General project'}
            </p>
          </div>
          <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            {job.createdAt ? `Posted ${new Date(job.createdAt).toLocaleDateString()}` : ''}
          </span>
        </header>

        <p style={{ color: theme.colors.textSecondary, lineHeight: 1.6 }}>{job.description}</p>

        <div style={{ display: 'flex', gap: theme.spacing[6], flexWrap: 'wrap', fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
            {job.location || 'Location not specified'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="currencyDollar" size={16} color={theme.colors.success} />
            {budgetLabel}
          </span>
          {job.postedBy?.name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="users" size={16} color={theme.colors.textSecondary} />
              {job.postedBy.name}
            </span>
          )}
        </div>

        <div
          style={{
            borderRadius: '16px',
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.backgroundSecondary,
            padding: theme.spacing[4],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], color: theme.colors.success }}>
            <Icon name="lightBulb" size={16} color={theme.colors.success} />
            Bidding tips
          </span>
          <ul style={{ margin: 0, paddingLeft: theme.spacing[5], lineHeight: 1.6 }}>
            <li>Be competitive but fair with pricing.</li>
            <li>Outline expected timeline and availability.</li>
            <li>Highlight similar projects or certifications.</li>
            <li>Keep your tone professional and friendly.</li>
          </ul>
        </div>
      </section>

      <section
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          border: `1px solid ${theme.colors.border}`,
          padding: theme.spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        <Input
          label="Bid amount (£) *"
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          min="0"
          step="0.01"
          placeholder="Enter the price for this job"
        />
        <Textarea
          label="Proposal description *"
          rows={6}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Explain how you plan to complete this job and what's included in your quote."
          maxLength={1000}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[3] }}>
          <Button variant="ghost" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit bid'}
          </Button>
        </div>
      </section>
    </div>
  );
}
