'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { fetchCurrentUser } from '@/lib/auth-client';
import { logger } from '@mintenance/shared';

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
  const [loadingCompanyName, setLoadingCompanyName] = useState(true);
  
  const [formData, setFormData] = useState({
    title: jobTitle,
    description: '',
    amount: '',
    start_date: '',
    end_date: '',
    terms: '',
    contractor_company_name: '',
    contractor_license_registration: '',
    contractor_license_type: '',
  });

  // Fetch contractor company name and license from verification API
  useEffect(() => {
    const loadContractorInfo = async () => {
      try {
        setLoadingCompanyName(true);
        const response = await fetch('/api/contractor/verification');
        if (response.ok) {
          const verificationData = await response.json();
          if (verificationData.data) {
            setFormData(prev => ({
              ...prev,
              contractor_company_name: verificationData.data.company_name || '',
              contractor_license_registration: verificationData.data.license_number || '',
            }));
          }
        }
      } catch (err) {
        logger.error('Error loading contractor verification info:', err);
      } finally {
        setLoadingCompanyName(false);
      }
    };

    if (isOpen) {
      loadContractorInfo();
    }
  }, [isOpen]);

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
    
    // Validate date format and convert to Date objects
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
      setError('Invalid start date format');
      return;
    }
    if (isNaN(endDate.getTime())) {
      setError('Invalid end date format');
      return;
    }
    
    if (endDate <= startDate) {
      setError('End date must be after start date');
      return;
    }
    if (!formData.contractor_company_name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.contractor_license_registration.trim()) {
      setError('License registration number is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // For datetime-local inputs, ensure we have valid ISO strings
      // If time is not provided, use start of day for start_date and end of day for end_date
      const startDateObj = new Date(formData.start_date);
      const endDateObj = new Date(formData.end_date);
      
      // Set start_date to beginning of day if time not specified
      const startDateISO = startDateObj.toISOString();
      
      // Set end_date to end of day (23:59:59) if time not specified
      const endDateISO = endDateObj.toISOString();
      
      const contractData = {
        job_id: jobId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        amount: amount,
        start_date: startDateISO,
        end_date: endDateISO,
        terms: formData.terms.trim() || undefined,
        contractor_company_name: formData.contractor_company_name.trim(),
        contractor_license_registration: formData.contractor_license_registration.trim(),
        contractor_license_type: formData.contractor_license_type.trim() || undefined,
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
      
      // Reset form (but keep company name if it was loaded)
      const currentCompanyName = formData.contractor_company_name;
      setFormData({
        title: jobTitle,
        description: '',
        amount: '',
        start_date: '',
        end_date: '',
        terms: '',
        contractor_company_name: currentCompanyName,
        contractor_license_registration: '',
        contractor_license_type: '',
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
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[1],
              marginBottom: 0,
            }}>
              Select the date and time when work will begin
            </p>
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
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[1],
              marginBottom: 0,
            }}>
              Select the date and time when work will be completed
            </p>
          </div>

          {/* Contractor Company Name */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Company Name *
            </label>
            <input
              type="text"
              value={formData.contractor_company_name}
              onChange={(e) => handleInputChange('contractor_company_name', e.target.value)}
              disabled={loadingCompanyName}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
                opacity: loadingCompanyName ? 0.6 : 1,
              }}
              placeholder={loadingCompanyName ? "Loading..." : "Enter your company name"}
              required
            />
            {loadingCompanyName && (
              <p style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                marginTop: theme.spacing[1],
                margin: 0,
              }}>
                Loading your company name...
              </p>
            )}
          </div>

          {/* License Registration */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              License Registration Number *
            </label>
            <input
              type="text"
              value={formData.contractor_license_registration}
              onChange={(e) => handleInputChange('contractor_license_registration', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
              }}
              placeholder="Enter your license registration number"
              required
            />
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[1],
              margin: 0,
            }}>
              This will be visible to the homeowner for verification and trust
            </p>
          </div>

          {/* License Type */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              License Type (Optional)
            </label>
            <select
              value={formData.contractor_license_type}
              onChange={(e) => handleInputChange('contractor_license_type', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.white,
              }}
            >
              <option value="">Select license type</option>
              <option value="General Contractor">General Contractor</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="HVAC">HVAC</option>
              <option value="Roofing">Roofing</option>
              <option value="Landscaping">Landscaping</option>
              <option value="Painting">Painting</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Other">Other</option>
            </select>
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

