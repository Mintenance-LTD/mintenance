'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

/**
 * Mint Editorial password field with a show/hide toggle. Extracted
 * from RegisterForm so the form stays under the 500-line per-file cap
 * and the password / confirm-password inputs share one implementation.
 */
export function RegisterPasswordField({
  id,
  label,
  placeholder,
  error,
  registration,
}: {
  id: string;
  label: string;
  placeholder: string;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  const [show, setShow] = React.useState(false);

  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--me-ink-2)',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className='field'
          placeholder={placeholder}
          autoComplete='new-password'
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{ paddingRight: 44 }}
          {...registration}
        />
        <button
          type='button'
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 30,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            color: 'var(--me-ink-3)',
            borderRadius: 6,
          }}
        >
          {show ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
        </button>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role='alert'
          style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--me-err-fg)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
