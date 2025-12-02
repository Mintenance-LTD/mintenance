'use client';

import React from 'react';
import { FormField, ValidatedInput, ValidatedTextarea } from '@/components/ui/FormField';
import { validateField, type JobFormData } from '../utils/validation';

interface JobFormFieldsProps {
  formData: JobFormData;
  onFieldChange: (fieldName: keyof JobFormData, value: string) => void;
  onFieldBlur: (fieldName: keyof JobFormData) => void;
  errors: Record<string, string>;
  touchedFields: Record<string, boolean>;
  uploadedImages: string[];
}

/**
 * Enhanced Job Form Fields with Checkatrade-style validation
 *
 * Features:
 * - Inline error messages next to fields
 * - Success checkmarks when field is valid
 * - Helper text for guidance
 * - Validation on blur for better UX
 * - Character counts for text fields
 */
export function EnhancedJobFormFields({
  formData,
  onFieldChange,
  onFieldBlur,
  errors,
  touchedFields,
  uploadedImages,
}: JobFormFieldsProps) {
  const isFieldValid = (fieldName: keyof JobFormData): boolean => {
    return touchedFields[fieldName] && !errors[fieldName] && Boolean(formData[fieldName]);
  };

  return (
    <>
      {/* Job Title */}
      <FormField
        label="Job Title"
        required
        error={touchedFields.title ? errors.title : undefined}
        success={isFieldValid('title')}
        helperText={
          touchedFields.title && !errors.title && formData.title
            ? `Great! Your title is clear and concise (${formData.title.length}/100 characters)`
            : 'Enter a clear, descriptive title (minimum 10 characters)'
        }
        htmlFor="job-title"
      >
        <ValidatedInput
          id="job-title"
          name="title"
          type="text"
          placeholder="e.g., Fix leaking kitchen faucet"
          value={formData.title}
          onChange={(e) => onFieldChange('title', e.target.value)}
          onBlur={() => onFieldBlur('title')}
          error={Boolean(touchedFields.title && errors.title)}
          success={isFieldValid('title')}
          maxLength={100}
        />
      </FormField>

      {/* Location */}
      <FormField
        label="Location"
        required
        error={touchedFields.location ? errors.location : undefined}
        success={isFieldValid('location')}
        helperText={
          touchedFields.location && !errors.location && formData.location
            ? 'Location verified'
            : 'Enter your full address or postcode'
        }
        htmlFor="job-location"
      >
        <ValidatedInput
          id="job-location"
          name="location"
          type="text"
          placeholder="Enter address or postcode"
          value={formData.location}
          onChange={(e) => onFieldChange('location', e.target.value)}
          onBlur={() => onFieldBlur('location')}
          error={Boolean(touchedFields.location && errors.location)}
          success={isFieldValid('location')}
        />
      </FormField>

      {/* Description */}
      <FormField
        label="Description"
        required
        error={touchedFields.description ? errors.description : undefined}
        success={isFieldValid('description')}
        helperText={
          touchedFields.description && !errors.description && formData.description
            ? `Excellent detail! (${formData.description.length}/5000 characters)`
            : `Provide detailed information about the work needed (minimum 50 characters, currently ${formData.description.length})`
        }
        htmlFor="job-description"
      >
        <ValidatedTextarea
          id="job-description"
          name="description"
          rows={6}
          placeholder="Describe the work needed in detail. Include any specific requirements, preferred materials, timeframes, etc."
          value={formData.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          onBlur={() => onFieldBlur('description')}
          error={Boolean(touchedFields.description && errors.description)}
          success={isFieldValid('description')}
          maxLength={5000}
        />
      </FormField>

      {/* Budget */}
      <FormField
        label="Budget (GBP)"
        required
        error={touchedFields.budget ? errors.budget : undefined}
        success={isFieldValid('budget')}
        helperText={
          touchedFields.budget && !errors.budget && formData.budget
            ? 'Budget set successfully'
            : 'Enter your budget (£50 - £50,000)'
        }
        htmlFor="job-budget"
      >
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
            £
          </span>
          <ValidatedInput
            id="job-budget"
            name="budget"
            type="number"
            placeholder="0"
            value={formData.budget}
            onChange={(e) => onFieldChange('budget', e.target.value)}
            onBlur={() => onFieldBlur('budget')}
            error={Boolean(touchedFields.budget && errors.budget)}
            success={isFieldValid('budget')}
            min="50"
            max="50000"
            step="50"
            className="pl-10"
          />
        </div>
      </FormField>
    </>
  );
}
