'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface ContractorCardProps {
  contractor: any;
}

/**
 * Card component displaying contractor details for homeowners
 */
export const ContractorCard: React.FC<ContractorCardProps> = ({ contractor }) => {
  const rating = contractor.rating || 0;
  const reviewCount = contractor.total_jobs_completed || 0;
  const specialties = contractor.contractor_skills?.map((s: any) => s.skill_name) || [];
  
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: '24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      border: `1px solid ${theme.colors.border}`
    }}>
      {/* Header with Photo */}
      <div style={{
        position: 'relative',
        height: '200px',
        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryLight})`
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          <img
            src={contractor.profile_image_url || 'https://via.placeholder.com/120x120/6B7280/FFFFFF?text=?'}
            alt={`${contractor.first_name} ${contractor.last_name}`}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `4px solid white`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}
          />
          {/* Verified Badge - Only show if email is verified */}
          {contractor.email_verified && (
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              backgroundColor: '#3B82F6',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid white`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              <svg width="16" height="16" fill="white" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Basic Info */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
            marginBottom: '4px'
          }}>
            {contractor.first_name} {contractor.last_name}
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary,
            margin: 0,
            marginBottom: '8px'
          }}>
            {contractor.company_name || 'Independent Contractor'}
          </p>
          {contractor.bio && (
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0,
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {contractor.bio}
            </p>
          )}
        </div>

        {/* Rating */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} style={{ color: theme.colors.warning }}>★</span>
            ))}
          </div>
          <span style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary
          }}>
            {rating.toFixed(1)}
          </span>
          <span style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textTertiary
          }}>
            ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
          </span>
        </div>

        {/* Quick Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: '12px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary
            }}>
              {contractor.city || 'Unknown'}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Location
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary
            }}>
              {contractor.total_jobs_completed || 0}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Jobs Done
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary
            }}>
              {contractor.rating ? rating.toFixed(1) : 'N/A'}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Rating
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            margin: '0 0 8px 0'
          }}>
            Specialties
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {specialties.length > 0 ? specialties.slice(0, 4).map((specialty: string, index: number) => (
              <span
                key={index}
                style={{
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium
                }}
              >
                {specialty}
              </span>
            )) : (
              <span style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontStyle: 'italic'
              }}>
                No specialties listed
              </span>
            )}
          </div>
        </div>

        {/* Availability */}
        <div style={{
          textAlign: 'center',
          marginTop: 'auto'
        }}>
          <div style={{
            backgroundColor: contractor.is_available ? '#10B981' : '#6B7280',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white', display: 'inline-block' }}></span>
            {contractor.is_available ? 'Available Now' : 'Currently Unavailable'}
          </div>
        </div>
      </div>
    </div>
  );
};

