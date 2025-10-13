'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface JobCardProps {
  job: any;
}

/**
 * Card component displaying job details for contractors
 */
export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px'
    }}>
      {/* Job Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <span style={{
            backgroundColor: theme.colors.primary,
            color: 'white',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            {job.category || 'General'}
          </span>
          <span style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm
          }}>
            {new Date(job.created_at).toLocaleDateString()}
          </span>
        </div>
        <h2 style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          margin: '0 0 8px 0'
        }}>
          {job.title || 'Untitled Job'}
        </h2>
        <p style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.textSecondary,
          lineHeight: theme.typography.lineHeight.relaxed
        }}>
          {job.description || 'No description provided.'}
        </p>
      </div>

      {/* Budget & Location */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: '12px'
      }}>
        <div>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textTertiary,
            marginBottom: '4px'
          }}>
            Budget
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary
          }}>
            £{job.budget ? parseFloat(job.budget).toLocaleString() : '0'}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textTertiary,
            marginBottom: '4px'
          }}>
            Location
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary
          }}>
            {job.location || 'Not specified'}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {job.timeline && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textTertiary,
            marginBottom: '8px'
          }}>
            Timeline
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textPrimary
          }}>
            {job.timeline}
          </div>
        </div>
      )}

      {/* Posted By */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '20px',
        borderTop: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.white,
          fontWeight: theme.typography.fontWeight.bold,
          fontSize: theme.typography.fontSize.base
        }}>
          {job.homeowner?.first_name?.[0] || 'H'}
        </div>
        <div>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textTertiary
          }}>
            Posted by
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textPrimary
          }}>
            {job.homeowner?.first_name || 'Homeowner'}
          </div>
        </div>
      </div>
    </div>
  );
};

