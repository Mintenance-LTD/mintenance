'use client';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatMoney } from '@/lib/utils/currency';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { PricingSuggestionCard } from './PricingSuggestionCard';

interface BidSubmissionClient2025Props {
  job: {
    id: string;
    title: string;
    description?: string;
    budget?: string;
    location?: string;
    category?: string;
    createdAt?: string;
    photos?: string[];
    homeowner?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      profile_image_url?: string;
    };
  };
  existingBid?: {
    amount: number;
    description: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    taxRate?: number;
    terms?: string;
    estimatedDuration?: number;
    proposedStartDate?: string;
  };
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function BidSubmissionClient2025({ job, existingBid }: BidSubmissionClient2025Props) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [amount, setAmount] = useState(existingBid?.amount?.toString() || '');
  const [description, setDescription] = useState(existingBid?.description || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    existingBid?.lineItems?.map(item => ({ ...item, id: Math.random().toString() })) || []
  );
  const [taxRate, setTaxRate] = useState(existingBid?.taxRate ?? 20);
  const [terms, setTerms] = useState(existingBid?.terms || '');
  const [estimatedDuration, setEstimatedDuration] = useState<number | ''>(existingBid?.estimatedDuration || '');
  const [proposedStartDate, setProposedStartDate] = useState(existingBid?.proposedStartDate || '');
  const [submitting, setSubmitting] = useState(false);

  // Pricing suggestion state
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [pricingSuggestion, setPricingSuggestion] = useState<any>(null);
  const [showPricingSuggestion, setShowPricingSuggestion] = useState(false);

  const homeownerName = job.homeowner?.first_name && job.homeowner?.last_name
    ? `${job.homeowner.first_name} ${job.homeowner.last_name}`.trim()
    : job.homeowner?.email || 'Homeowner';

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  const subtotal = useMemo(() => {
    if (lineItems.length === 0) return parseFloat(amount) || 0;
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }, [lineItems, amount]);

  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  // Platform fee calculation (5% of your bid)
  const platformFeeRate = 5;
  const platformFee = (totalAmount * platformFeeRate) / 100;
  const youWillReceive = totalAmount - platformFee;

  // Update amount when line items change (only in advanced mode with line items)
  // This prevents infinite loops by only updating when we have line items
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:88', message: 'useEffect triggered for amount update', data: { lineItemsLength: lineItems.length, subtotal, totalAmount, currentAmount: amount, shouldUpdate: lineItems.length > 0 && subtotal > 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'A' }) }).catch(() => {});
    // #endregion
    
    // Only auto-update amount when using advanced mode with line items
    // This prevents conflicts between manual amount input and line item calculations
    if (lineItems.length > 0 && subtotal > 0) {
      const newAmount = totalAmount.toFixed(2);
      // Only update if different to avoid unnecessary re-renders
      if (amount !== newAmount) {
        setAmount(newAmount);
      }
    }
  }, [totalAmount, lineItems.length, subtotal, amount]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Math.random().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  const removeLineItem = (id: string) => {
    const newLineItems = lineItems.filter((item) => item.id !== id);
    setLineItems(newLineItems);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:127', message: 'Line item removed', data: { removedId: id, remainingCount: newLineItems.length, willSwitchToAmount: newLineItems.length === 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => {});
    // #endregion

    // When all line items are removed, reset to manual amount input mode
    if (newLineItems.length === 0 && amount && parseFloat(amount) > 0) {
      // Keep the current amount but don't change it - user can edit manually
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:134', message: 'All line items removed, keeping manual amount', data: { currentAmount: amount }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => {});
      // #endregion
    }
  };

  // Fetch AI pricing suggestion
  const handleGetPricingSuggestion = async () => {
    try {
      setLoadingSuggestion(true);

      const response = await fetch('/api/agents/pricing/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          proposedPrice: amount ? parseFloat(amount) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || data.error || 'Failed to get pricing suggestion');
        return;
      }

      setPricingSuggestion(data.suggestion);
      setShowPricingSuggestion(true);
      toast.success('AI pricing suggestion generated!');
    } catch (error) {
      console.error('Error fetching pricing suggestion:', error);
      toast.error('Failed to get pricing suggestion. Please try again.');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  // Apply pricing suggestion
  const handleApplyPricingSuggestion = (price: number) => {
    setAmount(price.toFixed(2));
    setShowPricingSuggestion(false);
    toast.success(`Applied suggested price: £${price.toFixed(2)}`);
  };

  // Dismiss pricing suggestion
  const handleDismissPricingSuggestion = () => {
    setShowPricingSuggestion(false);
  };

  const handleSubmit = async () => {
    // #region agent log
    console.log('[BID_SUBMIT] handleSubmit called - FUNCTION START', { 
      amount, 
      descriptionLength: description?.length,
      estimatedDuration, 
      proposedStartDate, 
      submitting,
      totalAmount,
      subtotal,
      taxAmount,
      jobBudget: job.budget,
      timestamp: new Date().toISOString()
    });
    try {
      fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:143', message: 'handleSubmit called', data: { amount, descriptionLength: description?.length, estimatedDuration, proposedStartDate, submitting, totalAmount, subtotal, taxAmount, jobBudget: job.budget }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'button-debug', hypothesisId: 'A' }) }).catch(() => {});
    } catch (logErr) {
      console.error('[BID_SUBMIT] Log fetch error:', logErr);
    }
    // #endregion
    
    console.log('[BID_SUBMIT] Starting validation checks...', { amount, description: description?.substring(0, 50) });
    
    if (!amount || !description) {
      // #region agent log
      console.error('[BID_SUBMIT] ❌ Validation failed: missing amount or description', { hasAmount: !!amount, hasDescription: !!description, amount, descriptionLength: description?.length });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:155', message: 'Validation failed: missing fields', data: { hasAmount: !!amount, hasDescription: !!description }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'button-debug', hypothesisId: 'B' }) }).catch(() => {});
      } catch {}
      // #endregion
      toast.error('Please provide a bid amount and proposal description');
      return;
    }
    
    console.log('[BID_SUBMIT] ✅ Amount and description check passed');

    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      // #region agent log
      console.log('[BID_SUBMIT] Validation failed: invalid bid amount', { amount, bidAmount, isNaN: isNaN(bidAmount), isPositive: bidAmount > 0 });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:152', message: 'Validation failed: invalid amount', data: { amount, bidAmount, isNaN: isNaN(bidAmount), isPositive: bidAmount > 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => {});
      } catch {}
      // #endregion
      toast.error('Please enter a valid bid amount');
      return;
    }

    if (description.trim().length < 50) {
      // #region agent log
      console.log('[BID_SUBMIT] Validation failed: description too short', { length: description.trim().length });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:158', message: 'Validation failed: description too short', data: { length: description.trim().length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => {});
      } catch {}
      // #endregion
      toast.error(`Proposal must be at least 50 characters (currently ${description.trim().length})`);
      return;
    }

    if (!estimatedDuration || typeof estimatedDuration !== 'number' || estimatedDuration < 1) {
      // #region agent log
      console.log('[BID_SUBMIT] Validation failed: invalid duration', { estimatedDuration, type: typeof estimatedDuration });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:163', message: 'Validation failed: invalid duration', data: { estimatedDuration, type: typeof estimatedDuration }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => {});
      } catch {}
      // #endregion
      toast.error('Please enter a valid estimated duration (at least 1 day)');
      return;
    }

    if (!proposedStartDate) {
      // #region agent log
      console.log('[BID_SUBMIT] Validation failed: missing start date', { proposedStartDate });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:168', message: 'Validation failed: missing start date', data: { proposedStartDate }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => {});
      } catch {}
      // #endregion
      toast.error('Please select a proposed start date');
      return;
    }

    // Check if total bid amount exceeds job budget (client-side validation)
    if (job.budget) {
      const jobBudget = parseFloat(job.budget);
      if (!isNaN(jobBudget) && totalAmount > jobBudget) {
        // #region agent log
        console.log('[BID_SUBMIT] Validation failed: bid exceeds budget', { totalAmount, jobBudget });
        try {
          fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:177', message: 'Validation failed: bid exceeds budget', data: { totalAmount, jobBudget, difference: totalAmount - jobBudget, hasLineItems: lineItems.length > 0, taxAmount }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => {});
        } catch {}
        // #endregion
        
        const excess = totalAmount - jobBudget;
        const maxBaseAmount = taxRate > 0 ? (jobBudget / (1 + taxRate / 100)).toFixed(2) : jobBudget.toFixed(2);
        
        let errorMsg = `❌ Your total bid amount (£${totalAmount.toFixed(2)}) exceeds the job budget (£${jobBudget.toFixed(2)}) by £${excess.toFixed(2)}.`;
        
        if (taxAmount > 0) {
          errorMsg += `\n\nThis includes ${taxRate}% tax (£${taxAmount.toFixed(2)}).`;
          errorMsg += `\n💡 Maximum base amount (before tax): £${maxBaseAmount}`;
        }
        if (lineItems.length > 0) {
          errorMsg += `\n\nThis includes ${lineItems.length} line item(s).`;
        }
        errorMsg += `\n\nPlease adjust your bid amount to stay within the budget.`;
        
        // Show a prominent error toast
        toast.error(errorMsg, { 
          duration: 10000, // 10 seconds
          style: {
            maxWidth: '500px',
            whiteSpace: 'pre-line', // Allow line breaks
            fontSize: '14px',
            padding: '16px',
          },
          icon: '⚠️',
        });
        
        // Also log to console for debugging
        console.error('[BID_SUBMIT] ❌ Budget validation failed!');
        console.error('  Total Bid Amount: £' + totalAmount.toFixed(2));
        console.error('  Job Budget: £' + jobBudget.toFixed(2));
        console.error('  Excess Amount: £' + excess.toFixed(2));
        console.error('  Line Items Count:', lineItems.length);
        console.error('  Tax Amount: £' + taxAmount.toFixed(2));
        console.error('  Tax Rate:', taxRate + '%');
        
        return;
      }
    }

    console.log('[BID_SUBMIT] ✅ All validations passed, proceeding with submission');
    console.log('[BID_SUBMIT] Submission data:', {
      jobId: job.id,
      totalAmount,
      subtotal,
      taxAmount,
      taxRate,
      bidAmount: parseFloat(amount),
      proposalTextLength: description.trim().length,
      estimatedDuration,
      proposedStartDate,
      lineItemsCount: lineItems.length,
      jobBudget: job.budget,
    });

    try {
      setSubmitting(true);
      console.log('[BID_SUBMIT] setSubmitting(true) called');

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:269', message: 'Bid submission starting - all validations passed', data: { jobId: job.id, bidAmount: totalAmount, descriptionLength: description.trim().length, estimatedDuration, proposedStartDate, lineItemsCount: lineItems.length, subtotal, taxAmount, totalAmount, jobBudget: job.budget }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-budget-fix', hypothesisId: 'D' }) }).catch(() => {});
      // #endregion

      const quoteData = {
        lineItems: lineItems.length > 0 ? lineItems.map(({ description, quantity, unitPrice, total }) => ({
          description,
          quantity,
          unitPrice,
          total,
        })) : undefined,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        terms: terms.trim() || undefined,
      };

      const csrfHeaders = await getCsrfHeaders();
      
      // Ensure estimatedDuration is a number
      const durationValue = estimatedDuration !== '' && typeof estimatedDuration === 'number' 
        ? estimatedDuration 
        : undefined;
      
      // Ensure proposedStartDate is a valid string
      const startDateValue = proposedStartDate && proposedStartDate.trim() !== '' 
        ? proposedStartDate.trim() 
        : undefined;
      
      const requestPayload = {
        jobId: job.id,
        bidAmount: totalAmount,
        proposalText: description.trim(),
        ...quoteData,
        ...(durationValue !== undefined && { estimatedDuration: durationValue }),
        ...(startDateValue !== undefined && { proposedStartDate: startDateValue }),
      };
      
      // #region agent log
      console.log('[BID_SUBMIT] Request payload prepared', { 
        jobId: requestPayload.jobId, 
        bidAmount: requestPayload.bidAmount, 
        proposalTextLength: requestPayload.proposalText.length,
        estimatedDuration: requestPayload.estimatedDuration,
        proposedStartDate: requestPayload.proposedStartDate,
        hasLineItems: !!requestPayload.lineItems,
        lineItemsCount: requestPayload.lineItems?.length || 0,
      });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:249', message: 'Request payload prepared', data: { jobId: requestPayload.jobId, bidAmount: requestPayload.bidAmount, proposalTextLength: requestPayload.proposalText.length, estimatedDuration: requestPayload.estimatedDuration, proposedStartDate: requestPayload.proposedStartDate, hasLineItems: !!requestPayload.lineItems }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'D' }) }).catch(() => {});
      } catch {}
      // #endregion
      
      // #region agent log
      console.log('[BID_SUBMIT] Making API request to /api/contractor/submit-bid', {
        url: '/api/contractor/submit-bid',
        method: 'POST',
        hasCsrfHeaders: !!csrfHeaders,
        requestPayloadKeys: Object.keys(requestPayload),
      });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:325', message: 'Making API request', data: { url: '/api/contractor/submit-bid', method: 'POST', hasCsrfHeaders: !!csrfHeaders, requestPayloadKeys: Object.keys(requestPayload) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-budget-fix', hypothesisId: 'D' }) }).catch(() => {});
      } catch {}
      // #endregion
      
      console.log('[BID_SUBMIT] Fetch call starting...');
      const response = await fetch('/api/contractor/submit-bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify(requestPayload),
      });
      
      console.log('[BID_SUBMIT] ✅ API response received', { 
        status: response.status, 
        statusText: response.statusText, 
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // #region agent log
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:340', message: 'API response received', data: { status: response.status, statusText: response.statusText, ok: response.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-budget-fix', hypothesisId: 'E' }) }).catch(() => {});
      } catch {}
      // #endregion
      
      if (!response.ok) {
        console.error('[BID_SUBMIT] ❌ API returned non-OK status:', response.status, response.statusText);
        let errorData;
        try {
          errorData = await response.json();
          // Log full error response including debug info if available
          console.error('[BID_SUBMIT] 🔍 Full error response:', JSON.stringify(errorData, null, 2));
          if (errorData.debug) {
            console.error('[BID_SUBMIT] 🔍 Database error debug info:', errorData.debug);
            console.error('[BID_SUBMIT] 🔍 Error code:', errorData.debug.code);
            console.error('[BID_SUBMIT] 🔍 Error message:', errorData.debug.message);
            console.error('[BID_SUBMIT] 🔍 Error details:', errorData.debug.details);
            console.error('[BID_SUBMIT] 🔍 Error hint:', errorData.debug.hint);
          }
        } catch (jsonError) {
          // If response is not JSON, use status text
          console.error('[BID_SUBMIT] Failed to parse error response as JSON:', jsonError);
          throw new Error(`Failed to submit bid: ${response.statusText || 'Unknown error'}`);
        }
        
        // #region agent log
        try {
          fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:392', message: 'API error response - full details with debug', data: { status: response.status, error: errorData.error, details: errorData.details, debug: errorData.debug, fullErrorData: errorData }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-schema-fix', hypothesisId: 'E' }) }).catch(() => {});
        } catch {}
        // #endregion
        
        // Provide detailed error message to user
        let errorMessage = errorData.error || errorData.errorMessages?.[0] || 'Failed to submit bid';
        
        // Enhance budget-related error messages
        if (errorMessage.includes('cannot exceed job budget') || errorMessage.includes('exceeds job budget')) {
          const excessMatch = errorMessage.match(/£(\d+\.?\d*).*£(\d+\.?\d*)/);
          if (excessMatch) {
            const bidAmount = parseFloat(excessMatch[1]);
            const budget = parseFloat(excessMatch[2]);
            const excess = bidAmount - budget;
            errorMessage = `Your total bid amount (£${bidAmount.toFixed(2)}) exceeds the job budget (£${budget.toFixed(2)}) by £${excess.toFixed(2)}.`;
            if (lineItems.length > 0 || taxAmount > 0) {
              errorMessage += ` This includes your line items and ${taxRate}% tax. Please adjust your pricing to stay within the budget.`;
            } else {
              errorMessage += ` Please reduce your bid amount to stay within the budget.`;
            }
          }
        }
        
        // #region agent log
        console.log('[BID_SUBMIT] API error - throwing error with message', { errorMessage, originalError: errorData.error });
        try {
          fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:305', message: 'API error - enhanced error message', data: { errorMessage, originalError: errorData.error, details: errorData.details }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'E' }) }).catch(() => {});
        } catch {}
        // #endregion
        
        throw new Error(errorMessage);
      }

      console.log('[BID_SUBMIT] ✅ Response is OK, parsing JSON...');
      const data = await response.json();
      console.log('[BID_SUBMIT] ✅ Success response parsed:', { 
        message: data.message, 
        bidId: data.bid?.id,
        hasBid: !!data.bid 
      });
      
      // #region agent log
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:427', message: 'Bid submitted successfully', data: { message: data.message, bidId: data.bid?.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-budget-fix', hypothesisId: 'F' }) }).catch(() => {});
      } catch {}
      // #endregion
      
      console.log('[BID_SUBMIT] Showing success toast...');
      toast.success(data.message || 'Bid submitted successfully!');
      console.log('[BID_SUBMIT] Success toast shown');
      
      // #region agent log
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:443', message: 'Scheduling redirect', data: { redirectPath: '/contractor/bid', delay: 1200 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-budget-fix', hypothesisId: 'F' }) }).catch(() => {});
      } catch {}
      // #endregion
      
      console.log('[BID_SUBMIT] Setting timeout for redirect...');
      setTimeout(() => {
        console.log('[BID_SUBMIT] Executing redirect to /contractor/bid');
        // #region agent log
        try {
          fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:452', message: 'Executing redirect', data: { redirectPath: '/contractor/bid' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-budget-fix', hypothesisId: 'F' }) }).catch(() => {});
        } catch {}
        // #endregion
        router.push('/contractor/bid');
      }, 1200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit bid';
      
      // #region agent log
      console.error('[BID_SUBMIT] Error caught', { error, errorMessage });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:270', message: 'Bid submission error', data: { errorMessage, errorType: error instanceof Error ? error.constructor.name : typeof error, errorStack: error instanceof Error ? error.stack : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'E' }) }).catch(() => {});
      } catch {}
      // #endregion
      
      // Show error toast with longer duration for important errors
      const isBudgetError = errorMessage.includes('exceeds') || errorMessage.includes('budget');
      toast.error(errorMessage, { 
        duration: isBudgetError ? 8000 : 5000,
        style: {
          maxWidth: '500px',
        },
      });
      
      // #region agent log
      console.log('[BID_SUBMIT] Error toast shown', { errorMessage, isBudgetError });
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:365', message: 'Error toast displayed', data: { errorMessage, isBudgetError }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'E' }) }).catch(() => {});
      } catch {}
      // #endregion
    } finally {
      setSubmitting(false);
      // #region agent log
      console.log('[BID_SUBMIT] handleSubmit completed, setSubmitting(false) called');
      try {
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:276', message: 'handleSubmit finished', data: { submittingNow: false }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'G' }) }).catch(() => {});
      } catch {}
      // #endregion
    }
  };

  return (
    <ContractorPageWrapper>
      {/* Hero Header */}
      <MotionDiv
        className="bg-white border border-gray-200 rounded-xl p-8 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
              <svg className="w-9 h-9 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-1 text-gray-900">
                {existingBid ? 'Update Your Bid' : 'Submit a Bid'}
              </h1>
              <p className="text-gray-600 text-lg">Provide your quote and proposal details</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="w-full space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Job Details */}
            <div className="lg:col-span-1">
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Job Details</h2>

                {/* Job Images */}
                {job.photos && job.photos.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {job.photos.slice(0, 4).map((photo, index) => (
                      <div key={index} className="relative h-32 rounded-lg overflow-hidden">
                        <Image src={photo} alt={`Job photo ${index + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="font-bold text-gray-900 mb-2">{job.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{job.description}</p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {job.location || 'Location not specified'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {job.category || 'General'}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Budget: {job.budget ? `£${job.budget}` : 'TBD'}
                  </div>
                </div>

                {/* Homeowner Info */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Posted by</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      {job.homeowner?.profile_image_url ? (
                        <Image
                          src={job.homeowner.profile_image_url}
                          alt={homeownerName}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-teal-600 font-semibold">
                          {homeownerName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{homeownerName}</p>
                      <p className="text-xs text-gray-500">
                        {job.createdAt
                          ? new Date(job.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recently posted'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bidding Tips */}
                <div className="mt-6 p-4 bg-teal-50 rounded-xl border border-teal-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-teal-900">Bidding Tips</span>
                  </div>
                  <ul className="text-xs text-teal-800 space-y-1">
                    <li>• Be competitive but fair with pricing</li>
                    <li>• Outline your timeline and availability</li>
                    <li>• Highlight relevant experience</li>
                    <li>• Keep your tone professional</li>
                  </ul>
                </div>
              </MotionDiv>
            </div>

            {/* Right Column - Bid Form */}
            <div className="lg:col-span-2">
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                {/* Quote Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Your Quote</h2>
                  <button
                    onClick={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx:403', message: 'Toggle quote mode', data: { currentMode: showAdvanced ? 'advanced' : 'simple', newMode: showAdvanced ? 'simple' : 'advanced', lineItemsCount: lineItems.length, currentAmount: amount }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'C' }) }).catch(() => {});
                      // #endregion
                      setShowAdvanced(!showAdvanced);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {showAdvanced ? 'Simple Quote' : 'Advanced Quote'}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {!showAdvanced ? (
                    <MotionDiv
                      key="simple"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      {/* Simple Amount */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Your Bid Amount (£) *
                          </label>
                          <button
                            onClick={handleGetPricingSuggestion}
                            disabled={loadingSuggestion}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-blue-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {loadingSuggestion ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                AI Pricing Help
                              </>
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">£</span>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg ${
                              !amount ? 'border-gray-300' : 'border-teal-300'
                            }`}
                            required
                          />
                          {!amount && (
                            <div className="text-sm text-rose-600 mt-1">
                              Bid amount is required
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Pricing Suggestion Card */}
                      {showPricingSuggestion && pricingSuggestion && (
                        <PricingSuggestionCard
                          suggestion={pricingSuggestion}
                          onApplyPrice={handleApplyPricingSuggestion}
                          onDismiss={handleDismissPricingSuggestion}
                        />
                      )}

                      {/* Simple Pricing Breakdown */}
                      {amount && parseFloat(amount) > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                          <h4 className="text-sm font-medium text-gray-900 mb-4">Pricing Breakdown</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Your bid</span>
                              <span className="text-sm font-medium text-gray-900">£{parseFloat(amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Platform fee ({platformFeeRate}%)</span>
                              <span className="text-sm font-medium text-rose-600">-£{(parseFloat(amount) * platformFeeRate / 100).toFixed(2)}</span>
                            </div>
                            <div className="pt-3 border-t border-gray-300">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-semibold text-gray-900">You&apos;ll receive</span>
                                <span className="text-lg font-bold text-emerald-600">£{(parseFloat(amount) * (100 - platformFeeRate) / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-4">
                            The platform fee covers payment processing, dispute resolution, and customer support.
                          </p>
                        </div>
                      )}
                    </MotionDiv>
                  ) : (
                    <MotionDiv
                      key="advanced"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {/* Line Items */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-gray-700">Line Items</label>
                          <button
                            onClick={addLineItem}
                            className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Item
                          </button>
                        </div>

                        <div className="space-y-3">
                          {lineItems.map((item) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                placeholder="Description"
                                className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="Qty"
                                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                min="0"
                              />
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                placeholder="£ Price"
                                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                step="0.01"
                                min="0"
                              />
                              <div className="col-span-2 px-3 py-2 bg-white rounded-lg text-sm font-medium flex items-center">
                                £{item.total.toFixed(2)}
                              </div>
                              <button
                                onClick={() => removeLineItem(item.id)}
                                className="col-span-1 flex items-center justify-center text-rose-600 hover:text-rose-700"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tax Rate */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                          <input
                            type="number"
                            value={taxRate}
                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            step="0.1"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Budget Warning */}
                      {job.budget && (() => {
                        const jobBudget = parseFloat(job.budget);
                        const exceedsBudget = !isNaN(jobBudget) && totalAmount > jobBudget;
                        const excess = exceedsBudget ? totalAmount - jobBudget : 0;
                        
                        return exceedsBudget ? (
                          <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 mb-4">
                            <div className="flex items-start gap-3">
                              <svg className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-rose-900 mb-1">
                                  Budget Exceeded
                                </h4>
                                <p className="text-sm text-rose-800 mb-2">
                                  Your total bid (£{totalAmount.toFixed(2)}) exceeds the job budget (£{jobBudget.toFixed(2)}) by £{excess.toFixed(2)}.
                                  {taxAmount > 0 ? ` This includes ${taxRate}% tax (£${taxAmount.toFixed(2)}).` : ''}
                                  {lineItems.length > 0 ? ` This includes ${lineItems.length} line item(s).` : ''}
                                </p>
                                {taxAmount > 0 && (
                                  <p className="text-xs text-rose-700 mb-2 font-medium">
                                    💡 Maximum base amount (before tax): £{(jobBudget / (1 + taxRate / 100)).toFixed(2)}
                                  </p>
                                )}
                                <p className="text-xs text-rose-700">
                                  Please adjust your bid amount to stay within the budget before submitting.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Pricing Summary with PricingBreakdown Component */}
                      <PricingBreakdown
                        items={[
                          ...lineItems.map((item) => ({
                            id: item.id,
                            label: item.description || 'Line item',
                            amount: item.total,
                          })),
                          {
                            id: 'tax',
                            label: `VAT (${taxRate}%)`,
                            amount: taxAmount,
                          },
                        ]}
                        subtotal={subtotal}
                        total={totalAmount}
                        currency="£"
                        className="border border-gray-200"
                        showSubtotal={true}
                      />

                      {/* Platform Fee Breakdown */}
                      {lineItems.length > 0 && totalAmount > 0 && (
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                          <h4 className="text-sm font-medium text-teal-900 mb-4">Your Earnings</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-teal-700">Total bid amount</span>
                              <span className="text-sm font-medium text-teal-900">£{totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-teal-700">Platform fee ({platformFeeRate}%)</span>
                              <span className="text-sm font-medium text-rose-600">-£{platformFee.toFixed(2)}</span>
                            </div>
                            <div className="pt-3 border-t border-teal-300">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-semibold text-teal-900">You&apos;ll receive</span>
                                <span className="text-lg font-bold text-emerald-600">£{youWillReceive.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Terms */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Terms & Conditions (Optional)
                        </label>
                        <textarea
                          value={terms}
                          onChange={(e) => setTerms(e.target.value)}
                          placeholder="Payment terms, warranty, or special conditions..."
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          maxLength={2000}
                        />
                      </div>
                    </MotionDiv>
                  )}
                </AnimatePresence>

                {/* Proposal Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposal Description * (minimum 50 characters)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain your approach, timeline, and what's included in your quote..."
                    rows={6}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                      !description ? 'border-gray-300' : description.trim().length < 50 ? 'border-rose-300' : 'border-teal-300'
                    }`}
                    maxLength={5000}
                    required
                  />
                  <div className={`text-sm mt-1 ${
                    !description ? 'text-rose-600' : description.trim().length < 50 ? 'text-rose-600' : 'text-teal-600'
                  }`}>
                    {!description ? (
                      'Description is required'
                    ) : (
                      <>
                        {description.trim().length} / 50 characters minimum
                        {description.trim().length >= 50 && ' ✓'}
                      </>
                    )}
                  </div>
                </div>

                {/* Estimated Duration and Proposed Start Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Duration (days) *
                    </label>
                      <input
                        type="number"
                        value={estimatedDuration}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setEstimatedDuration('');
                          } else {
                            const numValue = parseInt(value, 10);
                            setEstimatedDuration(isNaN(numValue) ? '' : numValue);
                          }
                        }}
                        placeholder="e.g., 2"
                        min="1"
                        max="365"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        required
                      />
                    <p className="text-xs text-gray-500 mt-1">How many days will this job take?</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proposed Start Date *
                    </label>
                    <input
                      type="date"
                      value={proposedStartDate}
                      onChange={(e) => setProposedStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">When can you start this job?</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.back()}
                    disabled={submitting}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      if (!submitting) {
                        handleSubmit();
                      } else {
                        toast.error('Please wait, your bid is already being submitted...');
                      }
                    }}
                    disabled={submitting || !amount || !description}
                    type="button"
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    style={{ cursor: submitting || !amount || !description ? 'not-allowed' : 'pointer' }}
                    aria-label={existingBid ? 'Update Bid' : 'Submit Bid'}
                    title={!amount || !description ? 'Please fill in bid amount and description to submit' : ''}
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {existingBid ? 'Update Bid' : 'Submit Bid'}
                      </>
                    )}
                  </button>
                </div>
              </MotionDiv>
            </div>
          </div>
        </div>
    </ContractorPageWrapper>
  );
}
