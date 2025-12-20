'use client';

import React, { FormEvent, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { PageLayout, PageHeader } from '@/components/ui/PageLayout';
import { Card } from '@/components/ui/Card.unified';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge.unified';
import { Plus, Trash2 } from 'lucide-react';

const StatusChip = Badge;

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

type Feedback = { tone: 'success' | 'error'; message: string } | null;

const REQUIRED_STEPS = [
  { id: 'project', label: 'Project details' },
  { id: 'client', label: 'Client information' },
  { id: 'lineItems', label: 'Line items' },
  { id: 'review', label: 'Review & send' },
] as const;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value || 0);

export function CreateQuoteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectTitle, setProjectTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(30);
  const [includeVat, setIncludeVat] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Pre-fill form from URL params (when coming from Messages)
  useEffect(() => {
    const jobId = searchParams.get('jobId');
    const jobTitle = searchParams.get('jobTitle');
    const clientNameParam = searchParams.get('clientName');
    const clientEmailParam = searchParams.get('clientEmail');

    if (jobTitle) {
      setProjectTitle(jobTitle);
    }
    if (clientNameParam) {
      setClientName(clientNameParam);
    }
    if (clientEmailParam) {
      setClientEmail(clientEmailParam);
    }
    if (jobId && jobTitle) {
      // Optionally add a reference to the job in notes
      setNotes(`Quote for Job #${jobId}`);
    }
  }, [searchParams]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const tax = includeVat ? subtotal * 0.2 : 0;
  const total = subtotal + tax;

  const basicDetailsComplete = Boolean(projectTitle.trim());
  const clientDetailsComplete = Boolean(clientName.trim() && clientEmail.trim());
  const lineItemsComplete = lineItems.length > 0 && lineItems.every((item) => item.description.trim() && item.quantity > 0);
  const reviewComplete = basicDetailsComplete && clientDetailsComplete && lineItemsComplete;

  const completedSteps = [basicDetailsComplete, clientDetailsComplete, lineItemsComplete, reviewComplete].filter(Boolean).length;
  const progressValue = Math.round((completedSteps / REQUIRED_STEPS.length) * 100);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const resetStateAfterSubmit = () => {
    setProjectTitle('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }]);
    setNotes('');
    setValidDays(30);
  };

  const performSubmit = async (status: 'draft' | 'sent') => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/contractor/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle,
          clientName,
          clientEmail,
          clientPhone,
          lineItems,
          notes,
          validDays,
          status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save quote');
      }

      resetStateAfterSubmit();
      setFeedback({
        tone: 'success',
        message: status === 'draft' ? 'Quote saved as draft.' : 'Quote sent successfully.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong while saving your quote.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    await performSubmit('draft');
  };

  const handleSendQuote = async (event: FormEvent) => {
    event.preventDefault();

    if (!reviewComplete) {
      setFeedback({
        tone: 'error',
        message: 'Fill in the highlighted fields before sending your quote.',
      });
      return;
    }

    await performSubmit('sent');
  };

  const stepCompletionMap = useMemo(
    () => ({
      project: basicDetailsComplete,
      client: clientDetailsComplete,
      lineItems: lineItemsComplete,
      review: reviewComplete,
    }),
    [basicDetailsComplete, clientDetailsComplete, lineItemsComplete, reviewComplete],
  );

  return (
    <PageLayout
      sidebar={
        <>
          <Card.Dashboard title="Quote progress" subtitle="Complete each step to send a polished proposal.">
            <ProgressBar value={progressValue} tone={progressValue === 100 ? 'success' : 'primary'} />
            <div style={{ marginTop: theme.spacing[4], display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              {REQUIRED_STEPS.map((step) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}
                >
                  <StatusChip
                    variant={stepCompletionMap[step.id] ? 'success' : 'neutral'}
                    withDot
                    size="sm"
                  >
                    {step.label}
                  </StatusChip>
                  <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    {stepCompletionMap[step.id] ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </Card.Dashboard>

          <Card.Dashboard title="Need help?" subtitle="Jump back to your pipeline to review existing quotes.">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => router.push('/contractor/quotes')}
            >
              View all quotes
            </Button>
          </Card.Dashboard>
        </>
      }
    >
      <PageHeader
        title="Create quote"
        description="Build a detailed proposal with itemised pricing and clear terms."
      />

      {feedback && (
        <NotificationBanner
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
          action={
            feedback.tone === 'success' ? (
              <Button variant="ghost" size="sm" onClick={() => router.push('/contractor/quotes')}>
                Go to quotes
              </Button>
            ) : undefined
          }
        />
      )}

      <form onSubmit={handleSendQuote} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
        <Card.Dashboard title="Project overview" subtitle="Introduce what this quote covers.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            <Input
              label="Project title *"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Kitchen renovation for the Smith family"
              required
            />
            <Textarea
              label="Notes & scope"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Outline the scope of work, timelines, and any assumptions."
              rows={4}
            />
          </div>
        </Card.Dashboard>

        <Card.Dashboard title="Client details" subtitle="Let us know who this quote is for.">
          <div style={{ display: 'grid', gap: theme.spacing[4] }}>
            <Input
              label="Client name *"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Alex Smith"
              required
            />
            <Input
              label="Client email *"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="alex@example.com"
              required
            />
            <Input
              label="Client phone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+44 7700 900000"
            />
          </div>
        </Card.Dashboard>

        <Card.Dashboard
          title="Line items"
          subtitle="Break down labour, materials, or services to show how you reached the total."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 120px 120px 120px 40px',
              gap: theme.spacing[3],
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}>
              <span>Description</span>
              <span>Quantity</span>
              <span>Rate (£)</span>
              <span>Amount</span>
              <span></span>
            </div>

            {/* Line Items */}
            {lineItems.map((item, index) => (
              <div
                key={`line-item-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 120px 120px 120px 40px',
                  gap: theme.spacing[3],
                  alignItems: 'center',
                  padding: theme.spacing[3],
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.lg,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <Input
                  value={item.description}
                  onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)}
                  placeholder="e.g., Fitted cabinets and installation"
                  required
                />
                <Input
                  type="number"
                  value={item.quantity.toString()}
                  onChange={(e) => handleUpdateLineItem(index, 'quantity', Number(e.target.value) || 0)}
                  min="0"
                  required
                />
                <Input
                  type="number"
                  value={item.unit_price.toString()}
                  onChange={(e) => handleUpdateLineItem(index, 'unit_price', Number(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                />
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  {formatCurrency(item.quantity * item.unit_price)}
                </div>
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLineItem(index)}
                    style={{ padding: theme.spacing[1], minWidth: 'auto' }}
                    leftIcon={<Trash2 className="h-4 w-4 text-red-600" />}
                  >
                    <span className="sr-only">Remove item</span>
                  </Button>
                )}
              </div>
            ))}

            {/* Add Item Button */}
            <Button
              variant="secondary"
              type="button"
              onClick={handleAddLineItem}
              leftIcon={<Plus className="h-4 w-4" />}
              style={{ alignSelf: 'flex-start' }}
            >
              <span style={{ marginLeft: theme.spacing[2] }}>Add line item</span>
            </Button>
          </div>
        </Card.Dashboard>

        <Card.Dashboard title="Pricing summary">
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.textSecondary }}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {/* VAT Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                <input
                  type="checkbox"
                  id="include-vat"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="include-vat" style={{ cursor: 'pointer', color: theme.colors.textPrimary }}>
                  Include VAT (20%)
                </label>
              </div>
              {includeVat && <span style={{ color: theme.colors.textSecondary }}>{formatCurrency(tax)}</span>}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: theme.spacing[3],
                borderTop: `2px solid ${theme.colors.border}`,
                fontSize: theme.typography.fontSize.lg,
              }}
            >
              <strong>Total</strong>
              <strong style={{ color: theme.colors.primary }}>{formatCurrency(total)}</strong>
            </div>

            <div style={{
              padding: theme.spacing[3],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
            }}>
              <Input
                label="Quote valid for (days)"
                type="number"
                value={validDays.toString()}
                onChange={(e) => setValidDays(Math.max(1, Number(e.target.value) || 30))}
                min="1"
                max="365"
              />
            </div>
          </div>
        </Card.Dashboard>

        <div style={{ display: 'flex', gap: theme.spacing[3], justifyContent: 'flex-end' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/contractor/quotes')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save draft'}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send quote'}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}

