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
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
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
          {/* Verified Badge */}
          <div style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            backgroundColor: theme.colors.success,
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid white`
          }}>
            <svg width="14" height="14" fill="white" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
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
          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.primary,
            fontWeight: theme.typography.fontWeight.semibold,
            margin: 0
          }}>
            General Contractor
          </p>
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
            4.7
          </span>
          <span style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textTertiary
          }}>
            (3 reviews)
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
              5.2 km
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Away
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary
            }}>
              $45
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Per Hour
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary
            }}>
              8
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary
            }}>
              Years Exp
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Plumbing', 'Electrical', 'Carpentry'].map((specialty, index) => (
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
            ))}
          </div>
        </div>

        {/* Availability */}
        <div style={{
          textAlign: 'center',
          marginTop: 'auto'
        }}>
          <div style={{
            backgroundColor: theme.colors.success,
            color: 'white',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            display: 'inline-block',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
          }}>
            🟢 Available Now
          </div>
        </div>
      </div>
    </div>
  );
};

