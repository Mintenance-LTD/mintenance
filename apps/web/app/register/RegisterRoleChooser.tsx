'use client';

import React from 'react';
import { Home, Wrench, type LucideIcon } from 'lucide-react';
import type { Role } from './useRegisterSubmit';

/**
 * Role chooser — Direction A · Mint Editorial. Source of truth:
 * redesign-v2/auth.html WebSignUp ("I want to…" two-card selector).
 * Extracted from RegisterForm to keep that file under the 500-line cap.
 */

const ROLES: { id: Role; icon: LucideIcon; title: string; sub: string }[] = [
  {
    id: 'homeowner',
    icon: Home,
    title: 'Hire trades',
    sub: 'Post jobs, compare bids',
  },
  {
    id: 'contractor',
    icon: Wrench,
    title: 'Work on jobs',
    sub: 'Get matched, win work',
  },
];

export function RegisterRoleChooser({
  value,
  onChange,
  disabled,
  error,
}: {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <>
      <div
        id='role-label'
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--me-ink-2)',
          marginBottom: 6,
        }}
      >
        I want to…
      </div>
      <div
        role='radiogroup'
        aria-labelledby='role-label'
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: error ? 6 : 18,
        }}
      >
        {ROLES.map((r) => {
          const active = value === r.id;
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              type='button'
              role='radio'
              aria-checked={active}
              onClick={() => onChange(r.id)}
              disabled={disabled}
              style={{
                textAlign: 'left',
                padding: '14px',
                border: `1.5px solid ${
                  active ? 'var(--me-brand)' : 'var(--me-line)'
                }`,
                background: active
                  ? 'var(--me-brand-soft)'
                  : 'var(--me-surface)',
                borderRadius: 12,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Icon
                  size={18}
                  aria-hidden='true'
                  color={active ? 'var(--me-brand)' : 'var(--me-ink-2)'}
                />
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--me-ink)',
                  }}
                >
                  {r.title}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--me-ink-3)' }}>
                {r.sub}
              </div>
            </button>
          );
        })}
      </div>
      {error && (
        <p
          role='alert'
          style={{
            margin: '0 0 14px',
            fontSize: 12,
            color: 'var(--me-err-fg)',
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}
