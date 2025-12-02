'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatMoney } from '@/lib/utils/currency';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { MotionDiv } from '@/components/ui/MotionDiv';

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
  const [amount, setAmount] = useState(existingBid?.amount.toString() || '');
  const [description, setDescription] = useState(existingBid?.description || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    existingBid?.lineItems?.map(item => ({ ...item, id: Math.random().toString() })) || []
  );
  const [taxRate, setTaxRate] = useState(existingBid?.taxRate || 20);
  const [terms, setTerms] = useState(existingBid?.terms || '');
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (lineItems.length > 0 && subtotal > 0) {
      setAmount(totalAmount.toFixed(2));
    }
  }, [totalAmount, lineItems.length, subtotal]);

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
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!amount || !description) {
      toast.error('Please provide a bid amount and proposal description');
      return;
    }

    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    if (description.trim().length < 50) {
      toast.error(`Proposal must be at least 50 characters (currently ${description.trim().length})`);
      return;
    }

    try {
      setSubmitting(true);

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

      const response = await fetch('/api/contractor/submit-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          bidAmount: totalAmount,
          proposalText: description.trim(),
          ...quoteData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit bid');
      }

      const data = await response.json();
      toast.success(data.message || 'Bid submitted successfully!');
      setTimeout(() => router.push('/contractor/bid'), 1200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit bid';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-1">
                    {existingBid ? 'Update Your Bid' : 'Submit a Bid'}
                  </h1>
                  <p className="text-teal-100 text-lg">Provide your quote and proposal details</p>
                </div>
              </div>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-all border border-white/30"
              >
                Cancel
              </button>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-8 py-8 w-full">
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
                    onClick={() => setShowAdvanced(!showAdvanced)}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Amount (£) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">£</span>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg"
                          />
                        </div>
                      </div>
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

                      {/* Summary */}
                      <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">£{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax ({taxRate}%):</span>
                          <span className="font-medium">£{taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                          <span>Total:</span>
                          <span className="text-teal-600">£{totalAmount.toFixed(2)}</span>
                        </div>
                      </div>

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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    maxLength={5000}
                  />
                  <div className={`text-sm mt-1 ${description.trim().length < 50 ? 'text-rose-600' : 'text-gray-500'}`}>
                    {description.trim().length} / 50 characters minimum
                    {description.trim().length >= 50 && ' ✓'}
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
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
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
      </main>
    </div>
  );
}
