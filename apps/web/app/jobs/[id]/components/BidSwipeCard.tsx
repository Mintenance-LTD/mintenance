'use client';

import React from 'react';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { Icon } from '@/components/ui/Icon';

interface BidData {
  id: string;
  amount: number;
  message?: string;
  description?: string;
  status: string;
  created_at: string;
  timeline?: string;
  estimated_duration?: string;
}

interface PortfolioImage {
  url: string;
  title?: string;
}

interface ContractorData {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  rating?: number;
  total_jobs_completed?: number;
  profile_image_url?: string;
  portfolioImages?: Array<string | PortfolioImage>;
  years_experience?: number;
  license_number?: string;
  city?: string;
  country?: string;
}

interface BidSwipeCardProps {
  bid: BidData;
  contractor?: ContractorData;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  nextBid?: BidData;
  nextContractor?: ContractorData;
}

export function BidSwipeCard({ bid, contractor, onAccept, onReject, onClose }: BidSwipeCardProps) {
  // Debug: Log contractor data to check if portfolioImages are present
  React.useEffect(() => {
    logger.debug('BidSwipeCard - Contractor data:', {
      contractorId: contractor?.id,
      portfolioImages: contractor?.portfolioImages,
      portfolioImagesLength: contractor?.portfolioImages?.length,
      contractorKeys: contractor ? Object.keys(contractor) : [],
    });
  }, [contractor]);

  const contractorName = contractor?.first_name && contractor?.last_name
    ? `${contractor.first_name} ${contractor.last_name}`
    : 'Unknown Contractor';
  const initials = contractorName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing[4],
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[6],
        boxShadow: theme.shadows.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header with close button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Contractor Profile
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing[1],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.full,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icon name="x" size={24} color={theme.colors.textSecondary} />
          </button>
        </div>

        {/* Contractor Avatar & Name */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: theme.spacing[3],
          paddingBottom: theme.spacing[4],
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: contractor?.profile_image_url ? 'transparent' : theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: 'white',
            overflow: 'hidden',
            border: `4px solid ${theme.colors.primary}`,
            position: 'relative',
          }}>
            {contractor?.profile_image_url ? (
              <Image
                src={contractor.profile_image_url}
                alt={contractorName}
                fill
                className="object-cover"
                sizes="120px"
                priority
              />
            ) : (
              initials
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              {contractorName}
            </h3>
            {contractor?.email && (
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                marginTop: theme.spacing[1],
              }}>
                {contractor.email}
              </div>
            )}
            {contractor?.phone && (
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
              }}>
                {contractor.phone}
              </div>
            )}
          </div>
        </div>

        {/* Bid Amount */}
        <div style={{
          padding: theme.spacing[4],
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.lg,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[1],
          }}>
            Bid Amount
          </div>
          <div style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary,
          }}>
            £{Number(bid.amount).toLocaleString()}
          </div>
        </div>

        {/* Bid Description */}
        {bid.description && (
          <div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Proposal Details
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
              lineHeight: 1.6,
              padding: theme.spacing[3],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
            }}>
              {bid.description}
            </div>
          </div>
        )}

        {/* Additional Contractor Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: theme.spacing[3],
          paddingTop: theme.spacing[4],
          borderTop: `1px solid ${theme.colors.border}`,
        }}>
          {contractor?.city && (
            <div>
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing[1],
              }}>
                Location
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textPrimary,
              }}>
                {contractor.city}{contractor.country ? `, ${contractor.country}` : ''}
              </div>
            </div>
          )}
          <div>
            <div style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              Submitted
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
            }}>
              {new Date(bid.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Portfolio Section - Previous Work */}
        <div style={{
          paddingTop: theme.spacing[4],
          borderTop: `1px solid ${theme.colors.border}`,
        }}>
          <h3 style={{
            margin: 0,
            marginBottom: theme.spacing[3],
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Previous Work
          </h3>
          {contractor?.portfolioImages && contractor.portfolioImages.length > 0 ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: theme.spacing[2],
              }}>
                {contractor.portfolioImages.slice(0, 6).map((image: string | PortfolioImage, index: number) => {
                  const imageUrl = typeof image === 'string' ? image : image.url;
                  const imageTitle = typeof image === 'string' ? undefined : image.title;
                  return (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: theme.borderRadius.md,
                      overflow: 'hidden',
                      backgroundColor: theme.colors.backgroundSecondary,
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    style={{ position: 'relative' }}
                  >
                    <Image
                      src={imageUrl}
                      alt={imageTitle || `Portfolio image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                      loading="lazy"
                      onError={() => {
                        logger.error('Failed to load portfolio image:', imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  );
                })}
              </div>
              {contractor.portfolioImages.length > 6 && (
                <div style={{
                  marginTop: theme.spacing[2],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  textAlign: 'center',
                }}>
                  +{contractor.portfolioImages.length - 6} more images
                </div>
              )}
            </>
          ) : (
            <div style={{
              padding: theme.spacing[4],
              textAlign: 'center',
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
            }}>
              <Icon name="image" size={32} color={theme.colors.textTertiary} />
              <div style={{ marginTop: theme.spacing[2] }}>
                No portfolio images available
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: theme.spacing[4],
          paddingTop: theme.spacing[4],
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <button
            onClick={onReject}
            disabled={bid.status !== 'pending'}
            title="Reject Bid"
            aria-label="Reject Bid"
            style={{
              width: '56px',
              height: '56px',
              padding: 0,
              borderRadius: theme.borderRadius.full,
              border: `2px solid ${theme.colors.error}`,
              backgroundColor: 'transparent',
              color: theme.colors.error,
              cursor: bid.status === 'pending' ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: bid.status === 'pending' ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (bid.status === 'pending') {
                e.currentTarget.style.backgroundColor = theme.colors.error + '10';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = `0 4px 6px -1px ${theme.colors.error}40, 0 2px 4px -1px ${theme.colors.error}30`;
              }
            }}
            onMouseLeave={(e) => {
              if (bid.status === 'pending') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Icon name="x" size={24} color={theme.colors.error} />
          </button>
          <button
            onClick={onAccept}
            disabled={bid.status !== 'pending'}
            title="Accept Bid"
            aria-label="Accept Bid"
            style={{
              width: '56px',
              height: '56px',
              padding: 0,
              borderRadius: theme.borderRadius.full,
              border: 'none',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              cursor: bid.status === 'pending' ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3), 0 2px 4px -1px rgba(16, 185, 129, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              opacity: bid.status === 'pending' ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (bid.status === 'pending') {
                e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(16, 185, 129, 0.4), 0 4px 6px -2px rgba(16, 185, 129, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (bid.status === 'pending') {
                e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.3), 0 2px 4px -1px rgba(16, 185, 129, 0.2)';
              }
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2))',
              }}
            >
              {/* Simple, natural mint leaf - elongated oval, smooth edges */}
              <g>
                {/* Main leaf body - elongated oval, wider at bottom, tapering to point at top */}
                {/* Left edge: smooth concave curve, Right edge: slightly convex curve */}
                <path
                  d="M12 2.5C11 2.5 9.5 3 8.5 4.5C7.5 6 7 8 7 10C7 12 7.5 13.5 8.5 15C9.5 16.5 11 17.5 12.5 17.8C14 18 15.5 17.5 16.5 16C17.5 14.5 18 13 18 11C18 9 17.5 7 16.5 5.5C15.5 4 14 2.5 12 2.5Z"
                  fill="white"
                />
                {/* Central vein - prominent, from base to tip */}
                <path
                  d="M12 3L12 17"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                {/* Curved stem from bottom-left */}
                <path
                  d="M12 17Q10 17.5 9 19"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.9"
                />
                {/* Secondary veins - branching from central vein, curving outward */}
                {/* Left side veins (3-4 veins) */}
                <path
                  d="M12 7Q10 6.5 9 6"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
                <path
                  d="M12 9.5Q10.5 9 9.5 8.5"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
                <path
                  d="M12 12Q10.8 11.5 10 11"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
                <path
                  d="M12 14.5Q11 14 10.5 13.5"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
                {/* Right side veins (3-4 veins) */}
                <path
                  d="M12 7Q14 6.5 15 6"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
                <path
                  d="M12 9.5Q13.5 9 14.5 8.5"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
                <path
                  d="M12 12Q13.2 11.5 14 11"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
                <path
                  d="M12 14.5Q13 14 13.5 13.5"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
              </g>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

