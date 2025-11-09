'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

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

interface QuoteViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

export function QuoteViewModal({ isOpen, onClose, jobId }: QuoteViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [jobTitle, setJobTitle] = useState<string>('');

  useEffect(() => {
    if (isOpen && jobId) {
      fetchQuoteData();
    } else {
      setQuoteData(null);
      setError(null);
    }
  }, [isOpen, jobId]);

  const fetchQuoteData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch job details and bids
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      if (!jobResponse.ok) {
        throw new Error('Failed to fetch job');
      }

      const jobData = await jobResponse.json();
      setJobTitle(jobData.title || '');

      // Fetch bids for this job - we'll query directly from Supabase via an API
      // For now, try to get accepted bid or first bid
      const bidsResponse = await fetch(`/api/jobs/${jobId}?includeBids=true`);
      let bidId = null;

      if (bidsResponse.ok) {
        const jobWithBids = await bidsResponse.json();
        if (jobWithBids.bids && Array.isArray(jobWithBids.bids) && jobWithBids.bids.length > 0) {
          // Find accepted bid, or use the first bid
          const bid = jobWithBids.bids.find((b: any) => b.status === 'accepted') || jobWithBids.bids[0];
          bidId = bid.id;
        }
      }

      // If no bid found from job endpoint, try contractor bids endpoint
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

      // Fetch quote details
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: theme.spacing[4],
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[6],
          borderBottom: `1px solid ${theme.colors.border}`,
          paddingBottom: theme.spacing[4],
        }}>
          <div>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0,
              marginBottom: theme.spacing[1],
            }}>
              Quote Details
            </h2>
            {jobTitle && (
              <p style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                margin: 0,
              }}>
                {jobTitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing[2],
              borderRadius: theme.borderRadius.sm,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close"
          >
            <Icon name="x" size={20} color={theme.colors.textSecondary} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing[8],
            gap: theme.spacing[4],
          }}>
            <Icon name="loader" size={32} color={theme.colors.primary} className="animate-spin" />
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Loading quote...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            padding: theme.spacing[4],
            backgroundColor: '#FEE2E2',
            border: '1px solid #EF4444',
            borderRadius: theme.borderRadius.md,
            color: '#EF4444',
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing[4],
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <Icon name="alert" size={20} color="#EF4444" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Quote Content */}
        {quoteData && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {/* Client Info */}
            <div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[3],
              }}>
                Client Information
              </h3>
              <div style={{
                padding: theme.spacing[4],
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: theme.borderRadius.md,
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[2],
              }}>
                <div>
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textSecondary,
                  }}>
                    Name:
                  </span>
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textPrimary,
                    marginLeft: theme.spacing[2],
                  }}>
                    {quoteData.clientName}
                  </span>
                </div>
                <div>
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textSecondary,
                  }}>
                    Email:
                  </span>
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textPrimary,
                    marginLeft: theme.spacing[2],
                  }}>
                    {quoteData.clientEmail}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {quoteData.description && (
              <div>
                <h3 style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[3],
                }}>
                  Description
                </h3>
                <p style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textSecondary,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {quoteData.description}
                </p>
              </div>
            )}

            {/* Line Items */}
            {quoteData.lineItems && quoteData.lineItems.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[3],
                }}>
                  Line Items
                </h3>
                <div style={{
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: theme.spacing[3],
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textSecondary,
                  }}>
                    <span>Description</span>
                    <span>Quantity</span>
                    <span>Unit Price</span>
                    <span style={{ textAlign: 'right' }}>Total</span>
                  </div>

                  {/* Items */}
                  {quoteData.lineItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr',
                        gap: theme.spacing[3],
                        padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                        borderTop: `1px solid ${theme.colors.border}`,
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textPrimary,
                      }}
                    >
                      <span>{item.description}</span>
                      <span>{item.quantity}</span>
                      <span>£{item.unitPrice.toFixed(2)}</span>
                      <span style={{ textAlign: 'right', fontWeight: theme.typography.fontWeight.medium }}>
                        £{item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div style={{
              borderTop: `1px solid ${theme.colors.border}`,
              paddingTop: theme.spacing[4],
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[2],
                marginBottom: theme.spacing[4],
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  <span>Subtotal:</span>
                  <span>£{quoteData.subtotal.toFixed(2)}</span>
                </div>
                {quoteData.taxRate > 0 && (
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}>
                      <span>Tax ({quoteData.taxRate}%):</span>
                      <span>£{quoteData.taxAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                  paddingTop: theme.spacing[2],
                  borderTop: `1px solid ${theme.colors.border}`,
                  marginTop: theme.spacing[1],
                }}>
                  <span>Total:</span>
                  <span>£{quoteData.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {quoteData.terms && (
              <div>
                <h3 style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[3],
                }}>
                  Terms and Conditions
                </h3>
                <p style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  padding: theme.spacing[4],
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.md,
                }}>
                  {quoteData.terms}
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: theme.spacing[3],
              paddingTop: theme.spacing[4],
              borderTop: `1px solid ${theme.colors.border}`,
            }}>
              <Button variant="ghost" onClick={handlePrint}>
                <Icon name="printer" size={16} color={theme.colors.textPrimary} />
                Print
              </Button>
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Close button when no data */}
        {!quoteData && !loading && !error && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: theme.spacing[4],
          }}>
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

