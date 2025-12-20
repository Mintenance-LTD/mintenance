'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { QuoteLineItems, QuoteLineItem } from './QuoteLineItems';
import { logger } from '@mintenance/shared';

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
    homeowner?: { first_name?: string; last_name?: string; email?: string };
  };
}

type Feedback = { type: 'success' | 'error'; message: string } | null;

export function BidSubmissionClient({ job }: BidSubmissionClientProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvancedQuote, setShowAdvancedQuote] = useState(false);
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [taxRate, setTaxRate] = useState(20); // Default 20% VAT
  const [terms, setTerms] = useState('');

  const budgetLabel = useMemo(() => {
    if (!job.budget) return 'Budget TBD';
    const parsed = parseFloat(job.budget);
    if (Number.isNaN(parsed)) return 'Budget TBD';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(parsed);
  }, [job.budget]);

  const formattedDate = useMemo(() => {
    if (!job.createdAt) return '';
    // Use consistent locale to avoid hydration mismatches
    return new Date(job.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  }, [job.createdAt]);

  // Calculate subtotal from line items
  const subtotal = useMemo(() => {
    if (lineItems.length === 0) {
      // If no line items, use the manual amount
      return parseFloat(amount) || 0;
    }
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }, [lineItems, amount]);

  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  // Update amount when line items change (if using line items)
  useEffect(() => {
    if (lineItems.length > 0 && subtotal > 0) {
      setAmount(totalAmount.toFixed(2));
    }
  }, [totalAmount, lineItems.length, subtotal]);

  const handleSubmit = async () => {
    if (!amount || !description) {
      setFeedback({ type: 'error', message: 'Please add a bid amount and short proposal.' });
      return;
    }

    if (!job.id) {
      setFeedback({ type: 'error', message: 'Invalid job. Please try again from the jobs page.' });
      return;
    }

    const bidAmount = parseFloat(amount);
    if (Number.isNaN(bidAmount) || bidAmount <= 0) {
      setFeedback({ type: 'error', message: 'Enter a valid bid amount greater than zero.' });
      return;
    }

    // Validate proposal text length (minimum 50 characters)
    if (description.trim().length < 50) {
      setFeedback({
        type: 'error',
        message: `Proposal description must be at least 50 characters. You have ${description.trim().length} characters. Please provide more details about your approach, timeline, and experience.`
      });
      return;
    }

    if (description.trim().length > 5000) {
      setFeedback({ type: 'error', message: 'Proposal description cannot exceed 5000 characters.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      // Prepare quote data
      const quoteData = {
        lineItems: lineItems.length > 0 ? lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })) : undefined,
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        terms: terms.trim() || undefined,
      };

      const requestBody = {
        jobId: job.id,
        bidAmount: totalAmount, // Use calculated total
        proposalText: description.trim(),
        ...quoteData,
      };

      logger.info('Submitting bid', { jobId: job.id, bidAmount: totalAmount, proposalLength: description.trim().length });

      const response = await fetch('/api/contractor/submit-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Log response details immediately
      logger.debug('Response received', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      let responseData: Record<string, unknown> = {};
      let responseText = '';

      try {
        responseText = await response.text();
        // logger.debug('API Response details', { status: response.status, length: responseText.length });

        if (responseText && responseText.trim()) {
          try {
            responseData = JSON.parse(responseText);
            // logger.debug('API Response data', responseData);
          } catch (parseError) {
            logger.error('Failed to parse JSON response', { error: parseError, responseText });
            // If we can't parse JSON but have a status, use the status
            if (!response.ok) {
              throw new Error(`Server error (${response.status}): ${response.statusText || 'Unknown error'}. ${responseText.substring(0, 200)}`);
            }
            throw new Error(`Invalid response format: ${responseText.substring(0, 200)}`);
          }
        } else if (!response.ok) {
          // Empty response but error status - this is the issue!
          logger.warn('Empty response body with error status', {
            status: response.status,
            statusText: response.statusText,
          });
          // Create a meaningful error message based on status code
          const statusMessages: Record<number, string> = {
            400: 'Invalid request. Please check your bid details.',
            401: 'You must be logged in to submit a bid.',
            403: 'Only contractors can submit bids.',
            404: 'Job not found. Please try again.',
            409: 'You have already submitted a bid for this job.',
            422: 'Invalid bid data. Please check your inputs.',
            429: 'Too many requests. Please try again later.',
            500: 'Server error. Please try again later.',
            502: 'Bad gateway. Please try again later.',
            503: 'Service unavailable. Please try again later.',
          };
          const errorMsg = statusMessages[response.status] || `Request failed with status ${response.status}: ${response.statusText || 'Unknown error'}`;
          throw new Error(errorMsg);
        }
      } catch (readError: unknown) {
        // If we can't read the response at all
        logger.error('Error reading response', readError, {
          service: 'bid-submission',
        });
        if (!response.ok) {
          const statusMessages: Record<number, string> = {
            400: 'Invalid request. Please check your bid details.',
            401: 'You must be logged in to submit a bid.',
            403: 'Only contractors can submit bids.',
            404: 'Job not found. Please try again.',
            409: 'You have already submitted a bid for this job.',
            500: 'Server error. Please try again later.',
          };
          const errorMsg = statusMessages[response.status] || `Server error (${response.status}): ${response.statusText || 'Failed to read response'}`;
          throw new Error(errorMsg);
        }
        throw readError;
      }

      if (!response.ok) {
        // Define status messages first
        const getStatusMessage = (status: number): string => {
          const statusMessages: Record<number, string> = {
            400: 'Invalid request. Please check your bid details.',
            401: 'You must be logged in to submit a bid.',
            403: 'Only contractors can submit bids.',
            404: 'Job not found. Please try again.',
            409: 'You have already submitted a bid for this job.',
            422: 'Invalid bid data. Please check your inputs.',
            429: 'Too many requests. Please try again later.',
            500: 'Server error. Please try again later.',
            502: 'Bad gateway. Please try again later.',
            503: 'Service unavailable. Please try again later.',
          };
          return statusMessages[status] || `Request failed with status ${status}: ${response.statusText || 'Unknown error'}`;
        };

        // Log everything about the response
        const responseDataKeys = Object.keys(responseData);
        const isEmptyResponse = responseDataKeys.length === 0;

        // Log primitive values first to avoid console rendering issues
        // Debug logging removed for production

        // Check if response is empty FIRST, before any other processing
        if (isEmptyResponse) {
          const defaultMessage = getStatusMessage(response.status);
          logger.error('EMPTY RESPONSE - Throwing status-based error', { defaultMessage });
          throw new Error(defaultMessage);
        }

        // Handle validation errors with details (Zod validation)
        interface ValidationError {
          path?: string[];
          message?: string;
        }
        if (responseData.details && Array.isArray(responseData.details)) {
          const errorMessages = (responseData.details as ValidationError[]).map((err: ValidationError) => {
            if (err.path && err.path.length > 0) {
              const field = err.path[0];
              if (field === 'proposalText') {
                return err.message || 'Proposal description is invalid';
              }
              if (field === 'bidAmount') {
                return err.message || 'Bid amount is invalid';
              }
              if (field === 'jobId') {
                return err.message || 'Job ID is invalid';
              }
            }
            return err.message || 'Invalid input';
          });
          const combinedError: string = errorMessages.join('. ') || (typeof responseData.error === 'string' ? responseData.error : '') || 'Validation failed';
          throw new Error(combinedError);
        }

        // Try different error message fields
        const errorFromError = typeof responseData.error === 'string' ? responseData.error : '';
        const errorFromMessage = typeof responseData.message === 'string' ? responseData.message : '';
        const errorFromDetail = typeof responseData.detail === 'string' ? responseData.detail : '';

        const errorMessage = errorFromError || errorFromMessage || errorFromDetail || 'Validation failed';

        // Log primitive values
        // Error message extraction debug removed

        // Check if we have a valid, non-empty error message
        const hasValidErrorMessage = typeof errorMessage === 'string' && errorMessage.trim().length > 0;

        if (!hasValidErrorMessage) {
          const defaultMessage = getStatusMessage(response.status);
          logger.error('NO VALID ERROR - Throwing status-based error', { defaultMessage });
          throw new Error(defaultMessage);
        }

        // We have a valid error message from the API
        // BUT check if it's the generic "Failed to submit bid" message (which shouldn't happen)
        if (errorMessage === 'Failed to submit bid' || errorMessage === 'Failed to submit bid.') {
          const defaultMessage = getStatusMessage(response.status);
          logger.error('DETECTED GENERIC ERROR MESSAGE - Replacing with status-based error', { defaultMessage });
          throw new Error(defaultMessage);
        }

        // logger.debug('USING API ERROR MESSAGE', { errorMessage });
        throw new Error(errorMessage);
      }

      setFeedback({
        type: 'success',
        message: (responseData.message as string) || (responseData.updated ? 'Your bid has been updated successfully.' : 'Your bid has been submitted successfully.')
      });
      setTimeout(() => router.push('/contractor/bid'), 1200);
    } catch (error: unknown) {
      logger.error('Bid submission error', error, {
        service: 'bid-submission',
      });

      // Handle network errors
      if (error instanceof TypeError && error.message?.includes('fetch')) {
        setFeedback({ type: 'error', message: 'Network error. Please check your connection and try again.' });
        return;
      }

      // Extract meaningful error message
      let errorMessage = (error instanceof Error ? error.message : String(error)) || '';

      // If we still have the generic "Failed to submit bid" message, something went wrong
      // This should never happen with our error handling above, but just in case...
      if (!errorMessage || errorMessage === 'Failed to submit bid' || errorMessage === 'Failed to submit bid.' || errorMessage === 'Failed to submit bid. Please try again.') {
        errorMessage = 'An error occurred while submitting your bid. Please try again or contact support if the issue persists.';
        logger.error('Generic error message detected in catch block. This indicates an unexpected error flow.');
      }

      setFeedback({ type: 'error', message: errorMessage });
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
        <Alert
          variant={feedback.type === 'success' ? 'default' : 'destructive'}
          className="relative"
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle className={feedback.type === 'success' ? 'text-green-800' : ''}>
            {feedback.type === 'success' ? 'Success' : 'Error'}
          </AlertTitle>
          <AlertDescription className={feedback.type === 'success' ? 'text-green-700' : ''}>
            {feedback.message}
          </AlertDescription>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="absolute right-2 top-2 rounded-md p-1 hover:bg-black/10 transition-colors"
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
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
            {formattedDate ? `Posted ${formattedDate}` : ''}
          </span>
        </header>

        <p style={{ color: theme.colors.textSecondary, lineHeight: 1.6 }}>{job.description}</p>

        <div style={{ display: 'flex', gap: theme.spacing[6], flexWrap: 'wrap', fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
            {job.location || 'Location not specified'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="currencyPound" size={16} color={theme.colors.success} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              margin: 0,
            }}>
              Quote Details
            </h3>
            <button
              type="button"
              onClick={() => setShowAdvancedQuote(!showAdvancedQuote)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                backgroundColor: showAdvancedQuote ? theme.colors.primary : 'transparent',
                color: showAdvancedQuote ? theme.colors.textInverse : theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Icon
                name={showAdvancedQuote ? 'chevronUp' : 'chevronDown'}
                size={16}
                color={showAdvancedQuote ? theme.colors.textInverse : theme.colors.textPrimary}
              />
              {showAdvancedQuote ? 'Hide Details' : 'Advanced Quote Details'}
            </button>
          </div>

          {!showAdvancedQuote ? (
            <>
              <Input
                label="Total amount (£) *"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                min="0"
                step="0.01"
                placeholder="Enter the total price for this job"
              />
              <div style={{
                padding: theme.spacing[3],
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                💡 Tip: Use "Advanced Quote Details" to break down your pricing with line items, taxes, and terms.
              </div>
            </>
          ) : (
            <QuoteLineItems
              lineItems={lineItems}
              onChange={setLineItems}
              subtotal={subtotal}
              taxRate={taxRate}
              onTaxRateChange={setTaxRate}
            />
          )}

          <Textarea
            label="Proposal description *"
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Explain how you plan to complete this job and what's included in your quote. Minimum 50 characters."
            maxLength={5000}
          />
          {description && (
            <div style={{ fontSize: theme.typography.fontSize.xs, color: description.trim().length < 50 ? theme.colors.error : theme.colors.textSecondary }}>
              {description.trim().length} / 50 characters minimum {description.trim().length >= 50 && '✓'}
            </div>
          )}

          {showAdvancedQuote && (
            <Textarea
              label="Terms and conditions (optional)"
              rows={4}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              placeholder="Payment terms, warranty information, or any special conditions..."
              maxLength={2000}
            />
          )}

          {showAdvancedQuote && lineItems.length > 0 && (
            <div style={{
              padding: theme.spacing[4],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2],
              }}>
                <span>Final Total:</span>
                <span>£{totalAmount.toFixed(2)}</span>
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                This amount will be used as your bid amount.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[3], paddingTop: theme.spacing[4], borderTop: `1px solid ${theme.colors.border}` }}>
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
