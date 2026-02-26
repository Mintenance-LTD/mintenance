'use client';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { fadeIn } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { PricingSuggestionCard } from './PricingSuggestionCard';
import { BidJobDetailsPanel } from './BidJobDetailsPanel';
import { BidFormAdvancedMode } from './BidFormAdvancedMode';
import { logger } from '@mintenance/shared';
import type { BidSubmissionClient2025Props, LineItem, PricingSuggestion } from './bidSubmissionTypes';

export function BidSubmissionClient2025(props: BidSubmissionClient2025Props) {
  const { job, existingBid } = props || {};
  const router = useRouter();
  const { user } = useCurrentUser();
  const [amount, setAmount] = useState(existingBid?.amount?.toString() || '');
  const [description, setDescription] = useState(existingBid?.description || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    existingBid?.lineItems?.map(item => ({ ...item, id: Math.random().toString(), type: 'labor' as const })) || []
  );
  const [taxRate, setTaxRate] = useState(existingBid?.taxRate ?? 20);
  const [terms, setTerms] = useState(existingBid?.terms || '');
  const [estimatedDuration, setEstimatedDuration] = useState<number | ''>(existingBid?.estimatedDuration || '');
  const [proposedStartDate, setProposedStartDate] = useState(existingBid?.proposedStartDate || '');
  const [submitting, setSubmitting] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [pricingSuggestion, setPricingSuggestion] = useState<PricingSuggestion | null>(null);
  const [showPricingSuggestion, setShowPricingSuggestion] = useState(false);

  const homeownerName = job?.homeowner?.first_name && job?.homeowner?.last_name
    ? (job.homeowner.first_name + ' ' + job.homeowner.last_name).trim()
    : job?.homeowner?.email || 'Homeowner';

  const subtotal = useMemo(() => lineItems.length === 0 ? parseFloat(amount) || 0 : lineItems.reduce((sum, item) => sum + item.total, 0), [lineItems, amount]);
  const laborTotal = useMemo(() => lineItems.filter(i => i.type === 'labor').reduce((s, i) => s + i.total, 0), [lineItems]);
  const materialTotal = useMemo(() => lineItems.filter(i => i.type === 'material').reduce((s, i) => s + i.total, 0), [lineItems]);
  const equipmentTotal = useMemo(() => lineItems.filter(i => i.type === 'equipment').reduce((s, i) => s + i.total, 0), [lineItems]);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;
  const platformFeeRate = 5;
  const platformFee = (totalAmount * platformFeeRate) / 100;
  const youWillReceive = totalAmount - platformFee;

  useEffect(() => {
    if (lineItems.length > 0 && subtotal > 0) {
      const newAmount = totalAmount.toFixed(2);
      if (amount !== newAmount) setAmount(newAmount);
    }
  }, [totalAmount, lineItems.length, subtotal]);

  const addLineItem = () => setLineItems([...lineItems, { id: Math.random().toString(), description: '', type: 'labor', quantity: 1, unitPrice: 0, total: 0 }]);

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const removeLineItem = (id: string) => setLineItems(lineItems.filter((item) => item.id !== id));

  const handleGetPricingSuggestion = async () => {
    try {
      setLoadingSuggestion(true);
      const response = await fetch('/api/agents/pricing/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, proposedPrice: amount ? parseFloat(amount) : undefined }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || data.error || 'Failed to get pricing suggestion'); return; }
      setPricingSuggestion(data.suggestion);
      setShowPricingSuggestion(true);
      toast.success('AI pricing suggestion generated!');
    } catch (error) {
      logger.error('Error fetching pricing suggestion:', error, { service: 'ui' });
      toast.error('Failed to get pricing suggestion. Please try again.');
    } finally { setLoadingSuggestion(false); }
  };

  const handleApplyPricingSuggestion = (price: number) => { setAmount(price.toFixed(2)); setShowPricingSuggestion(false); toast.success('Applied suggested price: £' + price.toFixed(2)); };
  const handleDismissPricingSuggestion = () => setShowPricingSuggestion(false);

  const handleSubmit = async () => {
    if (!amount || !description) { toast.error('Please provide a bid amount and proposal description'); return; }
    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) { toast.error('Please enter a valid bid amount'); return; }
    if (description.trim().length < 50) { toast.error('Proposal must be at least 50 characters (currently ' + description.trim().length + ')'); return; }
    if (!estimatedDuration || typeof estimatedDuration !== 'number' || estimatedDuration < 1) { toast.error('Please enter a valid estimated duration (at least 1 day)'); return; }
    if (!proposedStartDate) { toast.error('Please select a proposed start date'); return; }

    if (job.budget) {
      const jobBudget = parseFloat(job.budget);
      if (!isNaN(jobBudget) && totalAmount > jobBudget) {
        const excess = totalAmount - jobBudget;
        const maxBase = taxRate > 0 ? (jobBudget / (1 + taxRate / 100)).toFixed(2) : jobBudget.toFixed(2);
        let errorMsg = 'Your total bid amount (£' + totalAmount.toFixed(2) + ') exceeds the job budget (£' + jobBudget.toFixed(2) + ') by £' + excess.toFixed(2) + '.';
        if (taxAmount > 0) errorMsg += '\n\nThis includes ' + taxRate + '% tax (£' + taxAmount.toFixed(2) + ').\nMaximum base amount (before tax): £' + maxBase;
        if (lineItems.length > 0) errorMsg += '\n\nThis includes ' + lineItems.length + ' line item(s).';
        errorMsg += '\n\nPlease adjust your bid amount to stay within the budget.';
        toast.error(errorMsg, { duration: 10000, style: { maxWidth: '500px', whiteSpace: 'pre-line', fontSize: '14px', padding: '16px' }, icon: <AlertTriangle className="w-5 h-5" /> });
        return;
      }
    }

    try {
      setSubmitting(true);
      const quoteData = {
        lineItems: lineItems.length > 0 ? lineItems.map(({ description, quantity, unitPrice, total }) => ({ description, quantity, unitPrice, total })) : undefined,
        subtotal, taxRate, taxAmount, totalAmount, terms: terms.trim() || undefined,
      };
      const csrfHeaders = await getCsrfHeaders();
      const durationValue = typeof estimatedDuration === 'number' ? estimatedDuration : undefined;
      const startDateValue = proposedStartDate && proposedStartDate.trim() !== '' ? proposedStartDate.trim() : undefined;
      const requestPayload = { jobId: job.id, bidAmount: totalAmount, proposalText: description.trim(), ...quoteData, ...(durationValue !== undefined && { estimatedDuration: durationValue }), ...(startDateValue !== undefined && { proposedStartDate: startDateValue }) };
      const response = await fetch('/api/contractor/submit-bid', { method: 'POST', headers: { 'Content-Type': 'application/json', ...csrfHeaders }, body: JSON.stringify(requestPayload) });

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch { throw new Error('Failed to submit bid: ' + (response.statusText || 'Unknown error')); }
        let errorMessage = errorData.error || errorData.errorMessages?.[0] || 'Failed to submit bid';
        if (errorMessage.includes('cannot exceed job budget') || errorMessage.includes('exceeds job budget')) {
          const excessMatch = errorMessage.match(/£(\d+\.?\d*).*£(\d+\.?\d*)/);
          if (excessMatch) {
            const b = parseFloat(excessMatch[1]); const bg = parseFloat(excessMatch[2]); const ex = b - bg;
            errorMessage = 'Your total bid amount (£' + b.toFixed(2) + ') exceeds the job budget (£' + bg.toFixed(2) + ') by £' + ex.toFixed(2) + '.';
            errorMessage += lineItems.length > 0 || taxAmount > 0 ? ' This includes your line items and ' + taxRate + '% tax. Please adjust your pricing to stay within the budget.' : ' Please reduce your bid amount to stay within the budget.';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast.success(data.message || 'Bid submitted successfully!');
      setTimeout(() => { router.push('/contractor/bid'); }, 1200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit bid';
      toast.error(errorMessage, { duration: errorMessage.includes('exceeds') || errorMessage.includes('budget') ? 8000 : 5000, style: { maxWidth: '500px' } });
    } finally { setSubmitting(false); }
  };

  return (
    <ContractorPageWrapper>
      {/* Hero Header */}
      <MotionDiv className="bg-white border border-gray-200 rounded-xl p-8 mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
              <svg className="w-9 h-9 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-1 text-gray-900">{existingBid ? 'Update Your Bid' : 'Submit a Bid'}</h1>
              <p className="text-gray-600 text-lg">Provide your quote and proposal details</p>
            </div>
          </div>
          <button onClick={() => router.back()} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all">Cancel</button>
        </div>
      </MotionDiv>

      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <BidJobDetailsPanel job={job} homeownerName={homeownerName} />
          </div>

          <div className="lg:col-span-2">
            <MotionDiv className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6" variants={fadeIn} initial="initial" animate="animate">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Your Quote</h2>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  {showAdvanced ? 'Simple Quote' : 'Advanced Quote'}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!showAdvanced ? (
                  <MotionDiv key="simple" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Your Bid Amount (£) *</label>
                        <button onClick={handleGetPricingSuggestion} disabled={loadingSuggestion} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-blue-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                          {loadingSuggestion ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span className="sr-only">Generating</span></>) : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>AI Pricing Help</>)}
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">£</span>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="0.01" min="0" className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg ${!amount ? 'border-gray-300' : 'border-teal-300'}`} required />
                        {!amount && <div className="text-sm text-rose-600 mt-1">Bid amount is required</div>}
                      </div>
                    </div>
                    {showPricingSuggestion && pricingSuggestion && (<PricingSuggestionCard suggestion={pricingSuggestion} onApplyPrice={handleApplyPricingSuggestion} onDismiss={handleDismissPricingSuggestion} />)}
                    {amount && parseFloat(amount) > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Pricing Breakdown</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Your bid</span><span className="text-sm font-medium text-gray-900">£{parseFloat(amount).toFixed(2)}</span></div>
                          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Platform fee ({platformFeeRate}%)</span><span className="text-sm font-medium text-rose-600">-£{(parseFloat(amount) * platformFeeRate / 100).toFixed(2)}</span></div>
                          <div className="pt-3 border-t border-gray-300"><div className="flex justify-between items-center"><span className="text-base font-semibold text-gray-900">You&apos;ll receive</span><span className="text-lg font-bold text-emerald-600">£{(parseFloat(amount) * (100 - platformFeeRate) / 100).toFixed(2)}</span></div></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">The platform fee covers payment processing, dispute resolution, and customer support.</p>
                      </div>
                    )}
                  </MotionDiv>
                ) : (
                  <MotionDiv key="advanced" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <BidFormAdvancedMode
                      lineItems={lineItems} taxRate={taxRate} taxAmount={taxAmount} subtotal={subtotal} totalAmount={totalAmount}
                      laborTotal={laborTotal} materialTotal={materialTotal} equipmentTotal={equipmentTotal}
                      platformFeeRate={platformFeeRate} platformFee={platformFee} youWillReceive={youWillReceive}
                      terms={terms} jobBudget={job.budget}
                      onAddLineItem={addLineItem} onUpdateLineItem={updateLineItem} onRemoveLineItem={removeLineItem}
                      onTaxRateChange={setTaxRate} onTermsChange={setTerms}
                    />
                  </MotionDiv>
                )}
              </AnimatePresence>

              {/* Proposal Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Proposal Description * (minimum 50 characters)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain your approach, timeline, and what's included in your quote..." rows={6} className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!description ? 'border-gray-300' : description.trim().length < 50 ? 'border-rose-300' : 'border-teal-300'}`} maxLength={5000} required />
                <div className={`text-sm mt-1 ${!description ? 'text-rose-600' : description.trim().length < 50 ? 'text-rose-600' : 'text-teal-600'}`}>
                  {!description ? 'Description is required' : (<>{description.trim().length} / 50 characters minimum{description.trim().length >= 50 && ' ✓'}</>)}
                </div>
              </div>

              {/* Duration and Start Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration (days) *</label>
                  <input type="number" value={estimatedDuration} onChange={(e) => { const v = e.target.value; if (v === '') setEstimatedDuration(''); else { const n = parseInt(v, 10); setEstimatedDuration(isNaN(n) ? '' : n); } }} placeholder="e.g., 2" min="1" max="365" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
                  <p className="text-xs text-gray-500 mt-1">How many days will this job take?</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proposed Start Date *</label>
                  <input type="date" value={proposedStartDate} onChange={(e) => setProposedStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
                  <p className="text-xs text-gray-500 mt-1">When can you start this job?</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => router.back()} disabled={submitting} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50">Cancel</button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!submitting) handleSubmit(); else toast.error('Please wait, your bid is already being submitted...'); }}
                  disabled={submitting || !amount || !description} type="button"
                  className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  style={{ cursor: submitting || !amount || !description ? 'not-allowed' : 'pointer' }}
                  aria-label={existingBid ? 'Update Bid' : 'Submit Bid'}
                  title={!amount || !description ? 'Please fill in bid amount and description to submit' : ''}
                >
                  {submitting ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</>) : (<><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{existingBid ? 'Update Bid' : 'Submit Bid'}</>)}
                </button>
              </div>
            </MotionDiv>
          </div>
        </div>
      </div>
    </ContractorPageWrapper>
  );
}
