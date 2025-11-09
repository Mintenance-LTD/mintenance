'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/Icon';
import { AlertCircle, Loader2, Printer } from 'lucide-react';
import { theme } from '@/lib/theme';

interface QuoteData {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientEmail: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  terms: string | null;
  notes: string | null;
  quoteDate: string;
  validUntil: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface QuoteViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
}

export function QuoteViewDialog({ open, onOpenChange, jobId }: QuoteViewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [jobTitle, setJobTitle] = useState<string>('');

  useEffect(() => {
    if (open && jobId) {
      fetchQuoteData();
    } else {
      setQuoteData(null);
      setError(null);
    }
  }, [open, jobId]);

  const fetchQuoteData = async () => {
    setLoading(true);
    setError(null);

    try {
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      if (!jobResponse.ok) {
        throw new Error('Failed to fetch job');
      }

      const jobData = await jobResponse.json();
      setJobTitle(jobData.title || '');

      const bidsResponse = await fetch(`/api/jobs/${jobId}?includeBids=true`);
      let bidId = null;

      if (bidsResponse.ok) {
        const jobWithBids = await bidsResponse.json();
        if (jobWithBids.bids && Array.isArray(jobWithBids.bids) && jobWithBids.bids.length > 0) {
          const bid = jobWithBids.bids.find((b: any) => b.status === 'accepted') || jobWithBids.bids[0];
          bidId = bid.id;
        }
      }

      if (!bidId) {
        const contractorBidsResponse = await fetch('/api/contractor/bids');
        if (contractorBidsResponse.ok) {
          const contractorBids = await contractorBidsResponse.json();
          const bid = Array.isArray(contractorBids) 
            ? contractorBids.find((b: any) => b.job_id === jobId && (b.status === 'accepted' || b.status === 'pending'))
            : null;
          if (bid) {
            bidId = bid.id;
          }
        }
      }

      if (!bidId) {
        setError('No bid found for this job');
        setLoading(false);
        return;
      }

      const quoteResponse = await fetch(`/api/bids/${bidId}/quote`);
      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json();
        throw new Error(errorData.error || 'Failed to fetch quote');
      }

      const data = await quoteResponse.json();
      
      if (!data.hasQuote || !data.quote) {
        setError('No detailed quote available for this bid');
        setLoading(false);
        return;
      }

      setQuoteData(data.quote);
      if (data.jobTitle) {
        setJobTitle(data.jobTitle);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quote Details</DialogTitle>
          {jobTitle && (
            <DialogDescription>{jobTitle}</DialogDescription>
          )}
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-600">Loading quote...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quote Content */}
        {quoteData && !loading && (
          <div className="space-y-6 mt-4">
            {/* Client Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Client Information</h3>
              <div className="p-4 bg-gray-50 rounded-md space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  <span className="text-sm text-gray-900 ml-2">{quoteData.clientName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <span className="text-sm text-gray-900 ml-2">{quoteData.clientEmail}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {quoteData.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {quoteData.description}
                </p>
              </div>
            )}

            {/* Line Items */}
            {quoteData.lineItems && quoteData.lineItems.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Line Items</h3>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 text-xs font-semibold text-gray-600">
                    <span>Description</span>
                    <span>Quantity</span>
                    <span>Unit Price</span>
                    <span className="text-right">Total</span>
                  </div>

                  {/* Items */}
                  {quoteData.lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-4 gap-4 p-4 border-t border-gray-200 text-sm text-gray-900"
                    >
                      <span>{item.description}</span>
                      <span>{item.quantity}</span>
                      <span>£{item.unitPrice.toFixed(2)}</span>
                      <span className="text-right font-medium">£{item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span>£{quoteData.subtotal.toFixed(2)}</span>
                </div>
                {quoteData.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax ({quoteData.taxRate}%):</span>
                    <span>£{quoteData.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200 mt-1">
                  <span>Total:</span>
                  <span>£{quoteData.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {quoteData.terms && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms and Conditions</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap p-4 bg-gray-50 rounded-md">
                  {quoteData.terms}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="ghost" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="primary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Close button when no data */}
        {!quoteData && !loading && !error && (
          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

