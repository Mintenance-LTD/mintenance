'use client';

import React, { ReactNode, FormEvent } from 'react';
import { useAriaLive } from './AriaLiveRegion';

interface AccessibleFormProps {
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  ariaLabel: string;
  ariaDescribedBy?: string;
  noValidate?: boolean;
}

/**
 * Accessible Form Wrapper with ARIA Attributes
 * WCAG 2.1 Level A - Criterion 1.3.5: Identify Input Purpose
 */
export function AccessibleForm({
  children,
  onSubmit,
  ariaLabel,
  ariaDescribedBy,
  noValidate = false,
}: AccessibleFormProps) {
  const { announceAssertive } = useAriaLive();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await onSubmit(e);
      announceAssertive('Form submitted successfully');
    } catch (error) {
      announceAssertive('Form submission failed. Please check the errors and try again.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      noValidate={noValidate}
      role="form"
    >
      {children}
    </form>
  );
}

interface AccessibleInputProps {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/**
 * Accessible Input Component with Proper Labels and Error Handling
 * WCAG 2.1 Level A - Criterion 3.3.2: Labels or Instructions
 */
export function AccessibleInput({
  id,
  label,
  type = 'text',
  required = false,
  error,
  helpText,
  autoComplete,
  placeholder,
  value,
  onChange,
  onBlur,
}: AccessibleInputProps) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  const ariaDescribedBy = [
    error && errorId,
    helpText && helpId,
  ].filter(Boolean).join(' ');

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
        {required && (
          <span className="required" aria-label="required">
            *
          </span>
        )}
      </label>

      {helpText && (
        <div id={helpId} className="help-text">
          {helpText}
        </div>
      )}

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={ariaDescribedBy || undefined}
        aria-errormessage={error ? errorId : undefined}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`form-input ${error ? 'error' : ''}`}
      />

      {error && (
        <div id={errorId} role="alert" className="error-message">
          <span className="error-icon" aria-hidden="true">⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}

interface AccessibleSelectProps {
  id: string;
  label: string;
  options: { value: string; label: string; disabled?: boolean }[];
  required?: boolean;
  error?: string;
  helpText?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/**
 * Accessible Select Component
 * WCAG 2.1 Level A - Criterion 1.3.1: Info and Relationships
 */
export function AccessibleSelect({
  id,
  label,
  options,
  required = false,
  error,
  helpText,
  value,
  onChange,
  onBlur,
}: AccessibleSelectProps) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  const ariaDescribedBy = [
    error && errorId,
    helpText && helpId,
  ].filter(Boolean).join(' ');

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
        {required && (
          <span className="required" aria-label="required">
            *
          </span>
        )}
      </label>

      {helpText && (
        <div id={helpId} className="help-text">
          {helpText}
        </div>
      )}

      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={ariaDescribedBy || undefined}
        aria-errormessage={error ? errorId : undefined}
        className={`form-select ${error ? 'error' : ''}`}
      >
        <option value="">Select an option</option>
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <div id={errorId} role="alert" className="error-message">
          <span className="error-icon" aria-hidden="true">⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}

interface AccessibleCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  helpText?: string;
}

/**
 * Accessible Checkbox Component
 */
export function AccessibleCheckbox({
  id,
  label,
  checked,
  onChange,
  error,
  helpText,
}: AccessibleCheckboxProps) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  const ariaDescribedBy = [
    error && errorId,
    helpText && helpId,
  ].filter(Boolean).join(' ');

  return (
    <div className="form-field checkbox-field">
      <div className="checkbox-wrapper">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy || undefined}
          aria-errormessage={error ? errorId : undefined}
          className="form-checkbox"
        />
        <label htmlFor={id} className="checkbox-label">
          {label}
        </label>
      </div>

      {helpText && (
        <div id={helpId} className="help-text">
          {helpText}
        </div>
      )}

      {error && (
        <div id={errorId} role="alert" className="error-message">
          <span className="error-icon" aria-hidden="true">⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}