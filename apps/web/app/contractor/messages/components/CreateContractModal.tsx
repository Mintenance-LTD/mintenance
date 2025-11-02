'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  onContractCreated: () => void;
}

export function CreateContractModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  onContractCreated,
}: CreateContractModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: jobTitle,
    description: '',
    amount: '',
    start_date: '',
    end_date: '',
    terms: '',
  });

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    const amount = parseFloat(formData.amount);
    if (!formData.amount || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!formData.start_date) {
      setError('Start date is required');
      return;
    }
    if (!formData.end_date) {
      setError('End date is required');
      return;
    }
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    if (endDate <= startDate) {
      setError('End date must be after start date');
      return;
    }

    setIsSubmitting(true);

    try {
      const contractData = {
        job_id: jobId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        amount: amount,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        terms: formData.terms.trim() || undefined,
      };

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create contract');
      }

      // Success
      onContractCreated();
      onClose();
      
      // Reset form
      setFormData({
        title: jobTitle,
        description: '',
        amount: '',
        start_date: '',
        end_date: '',
        terms: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
    setError(null);
  };

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
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing[6],
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: theme.shadows.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: theme.spacing[6] }}>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
            marginBottom: theme.spacing[2],
          }}>
            Create Contract
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0,
          }}>
            Fill out the contract details for this job
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: theme.colors.error + '20',
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing[4],
            color: theme.colors.error,
            fontSize: theme.typography.fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}>
            <Icon name="xCircle" size={20} color={theme.colors.error} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
              }}
              placeholder="Contract title"
              required
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              placeholder="Describe the work to be performed..."
              required
            />
          </div>

          {/* Amount */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Amount (£) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
              }}
              placeholder="0.00"
              required
            />
          </div>

          {/* Start Date */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Start Date *
            </label>
            <input
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
              }}
              required
            />
          </div>

          {/* End Date */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              End Date *
            </label>
            <input
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
              }}
              required
            />
          </div>

          {/* Terms */}
          <div style={{ marginBottom: theme.spacing[6] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Additional Terms (Optional)
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => handleInputChange('terms', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              placeholder="Any additional terms or conditions..."
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: theme.spacing[3],
            justifyContent: 'flex-end',
          }}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: 'transparent',
                color: theme.colors.textPrimary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: isSubmitting ? theme.colors.textTertiary : theme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              {isSubmitting ? (
                <>
                  <Icon name="loader" size={20} color="white" />
                  Creating...
                </>
              ) : (
                <>
                  <Icon name="fileText" size={20} color="white" />
                  Create Contract
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

