'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { BidSwipeCard } from './BidSwipeCard';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BidListClientProps {
  bids: any[];
  jobId: string;
}

export function BidListClient({ bids, jobId }: BidListClientProps) {
  const router = useRouter();
  const [selectedBidIndex, setSelectedBidIndex] = useState<number | null>(null);
  const [processingBid, setProcessingBid] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const selectedBid = selectedBidIndex !== null ? bids[selectedBidIndex] : null;

  const handleBidClick = (index: number) => {
    setSelectedBidIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedBidIndex(null);
  };

  const handleAcceptBid = async (bidId: string) => {
    if (processingBid) return;
    
    try {
      setProcessingBid(bidId);
      
      const response = await fetch(`/api/jobs/${jobId}/bids/${bidId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || `Failed to accept bid (${response.status})`;
        console.error('Error accepting bid:', {
          status: response.status,
          error: errorMessage,
          details: data,
        });
        throw new Error(errorMessage);
      }

      // Refresh the page to show updated bid status
      router.refresh();
      handleCloseModal();
    } catch (error) {
      console.error('Error accepting bid:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept bid. Please try again.';
      setErrorDialog({ open: true, message: errorMessage });
    } finally {
      setProcessingBid(null);
    }
  };

  const handleRejectBid = async (bidId: string) => {
    if (processingBid) return;
    
    try {
      setProcessingBid(bidId);
      
      const response = await fetch(`/api/jobs/${jobId}/bids/${bidId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || `Failed to reject bid (${response.status})`;
        console.error('Error rejecting bid:', {
          status: response.status,
          error: errorMessage,
          details: data,
        });
        throw new Error(errorMessage);
      }

      // Refresh the page to show updated bid status
      router.refresh();
      handleCloseModal();
    } catch (error) {
      console.error('Error rejecting bid:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject bid. Please try again.';
      setErrorDialog({ open: true, message: errorMessage });
    } finally {
      setProcessingBid(null);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
        {bids.map((bid: any, index: number) => {
          const bidContractor = bid.contractor;
          const contractorName = bidContractor?.first_name && bidContractor?.last_name
            ? `${bidContractor.first_name} ${bidContractor.last_name}`
            : 'Unknown Contractor';
          const initials = contractorName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={bid.id}
              onClick={() => handleBidClick(index)}
              style={{
                padding: theme.spacing[4],
                backgroundColor: bid.status === 'accepted' ? '#F0FDF4' : theme.colors.backgroundSecondary,
                borderRadius: theme.borderRadius.md,
                border: bid.status === 'accepted' ? `2px solid ${theme.colors.success}` : `1px solid ${theme.colors.border}`,
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (bid.status !== 'accepted') {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = theme.shadows.lg;
                }
              }}
              onMouseLeave={(e) => {
                if (bid.status !== 'accepted') {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <div style={{
                display: 'flex',
                gap: theme.spacing[3],
                alignItems: 'flex-start',
              }}>
                {/* Contractor Avatar */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: bidContractor?.profile_image_url ? 'transparent' : theme.colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: 'white',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {bidContractor?.profile_image_url ? (
                    <img
                      src={bidContractor.profile_image_url}
                      alt={contractorName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    initials
                  )}
                </div>

                {/* Contractor Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: theme.spacing[2],
                    flexWrap: 'wrap',
                    gap: theme.spacing[2],
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                        <div style={{
                          fontSize: theme.typography.fontSize.base,
                          fontWeight: theme.typography.fontWeight.semibold,
                          color: theme.colors.textPrimary,
                          marginBottom: '2px',
                        }}>
                          {contractorName}
                        </div>
                        {bidContractor?.admin_verified && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              padding: '2px',
                            }}
                            title="Verified Contractor - License and company verified by admin"
                          >
                            <Icon name="mintLeaf" size={18} color="white" />
                          </div>
                        )}
                      </div>
                      {bidContractor?.email && (
                        <div style={{
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary,
                        }}>
                          {bidContractor.email}
                        </div>
                      )}
                      {bidContractor?.phone && (
                        <div style={{
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary,
                        }}>
                          {bidContractor.phone}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize['2xl'],
                      fontWeight: theme.typography.fontWeight.bold,
                      color: bid.status === 'accepted' ? theme.colors.success : theme.colors.primary,
                    }}>
                      £{Number(bid.amount).toLocaleString()}
                    </div>
                  </div>

                  {/* Quote Available Indicator */}
                  {bid.quote_id && (
                    <div style={{
                      marginTop: theme.spacing[2],
                      padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                      backgroundColor: theme.colors.primary + '10',
                      borderRadius: theme.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.primary,
                    }}>
                      <Icon name="fileText" size={14} color={theme.colors.primary} />
                      <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
                        Detailed quote with line items available
                      </span>
                    </div>
                  )}

                  {/* Bid Description */}
                  {bid.description && (
                    <div style={{
                      marginTop: theme.spacing[2],
                      padding: theme.spacing[3],
                      backgroundColor: bid.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : theme.colors.backgroundTertiary,
                      borderRadius: theme.borderRadius.md,
                    }}>
                      <div style={{
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing[1],
                      }}>
                        Proposal Details:
                      </div>
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textPrimary,
                        lineHeight: 1.6,
                      }}>
                        {bid.description}
                      </div>
                    </div>
                  )}

                  {/* Bid Status & Date */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: theme.spacing[2],
                    paddingTop: theme.spacing[2],
                    borderTop: `1px solid ${theme.colors.border}`,
                  }}>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}>
                      Submitted {new Date(bid.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    {bid.status === 'accepted' && (
                      <div style={{
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.success,
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing[1],
                      }}>
                        <Icon name="checkCircle" size={14} color={theme.colors.success} />
                        Accepted Bid
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Click to view hint */}
              {bid.status !== 'accepted' && (
                <div style={{
                  marginTop: theme.spacing[2],
                  paddingTop: theme.spacing[2],
                  borderTop: `1px solid ${theme.colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textTertiary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing[1],
                  }}>
                    <Icon name="info" size={14} color={theme.colors.textTertiary} />
                    Click to view profile & accept/reject
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedBid && selectedBidIndex !== null && (
        <BidSwipeCard
          bid={selectedBid}
          contractor={selectedBid.contractor}
          onAccept={() => handleAcceptBid(selectedBid.id)}
          onReject={() => handleRejectBid(selectedBid.id)}
          onClose={handleCloseModal}
        />
      )}

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open: boolean) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setErrorDialog({ open: false, message: '' })}>
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

