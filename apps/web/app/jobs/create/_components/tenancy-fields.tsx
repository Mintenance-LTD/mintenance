/**
 * TenancyFields — R6 #19 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Inline block shown at the bottom of the Details step. Two questions:
 *   1. Is this a rental property?  (yes / no)
 *   2. Who pays?                    (me / someone else — email)
 *
 * Both are optional. When not set, behaviour is identical to today's
 * flow (no tenancy_metadata, homeowner = payer).
 *
 * Direction A · Mint Editorial — token-styled.
 */

import React from 'react';
import type { JobFormData } from './types';

interface Props {
  formData: JobFormData;
  setFormData: React.Dispatch<React.SetStateAction<JobFormData>>;
}

export function TenancyFields({ formData, setFormData }: Props) {
  const isRental = formData.is_rental_property === true;
  const whoPays = formData.who_pays ?? 'me';

  return (
    <div
      style={{
        border: '1px solid var(--me-line)',
        borderRadius: 'var(--me-radius-card)',
        padding: 20,
        background: 'var(--me-bg-2)',
      }}
    >
      <h3 className='t-h4' style={{ marginBottom: 2 }}>
        About this property
      </h3>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: 13,
          color: 'var(--me-ink-2)',
        }}
      >
        Optional — helps us contact the right people about scheduling and
        paperwork.
      </p>

      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 16,
          cursor: 'pointer',
        }}
      >
        <input
          type='checkbox'
          checked={isRental}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              is_rental_property: e.target.checked,
            }))
          }
          style={{ marginTop: 2, accentColor: 'var(--me-brand)' }}
        />
        <div>
          <span
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--me-ink)',
            }}
          >
            This is a rental property
          </span>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--me-ink-3)',
            }}
          >
            We&apos;ll route tenant-facing messages accordingly.
          </span>
        </div>
      </label>

      <fieldset
        style={{
          border: 0,
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <legend
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--me-ink)',
            marginBottom: 4,
          }}
        >
          Who pays for this job?
        </legend>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <input
            type='radio'
            name='who_pays'
            value='me'
            checked={whoPays === 'me'}
            onChange={() =>
              setFormData((prev) => ({ ...prev, who_pays: 'me' }))
            }
            style={{ accentColor: 'var(--me-brand)' }}
          />
          <span style={{ fontSize: 14, color: 'var(--me-ink)' }}>
            I&apos;ll pay
          </span>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <input
            type='radio'
            name='who_pays'
            value='someone_else'
            checked={whoPays === 'someone_else'}
            onChange={() =>
              setFormData((prev) => ({
                ...prev,
                who_pays: 'someone_else',
              }))
            }
            style={{ accentColor: 'var(--me-brand)' }}
          />
          <span style={{ fontSize: 14, color: 'var(--me-ink)' }}>
            Someone else pays (landlord / agent)
          </span>
        </label>
      </fieldset>

      {whoPays === 'someone_else' && (
        <div style={{ marginTop: 12 }}>
          <label
            htmlFor='payer-email'
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--me-ink-2)',
              marginBottom: 6,
            }}
          >
            Payer&apos;s email
          </label>
          <input
            id='payer-email'
            type='email'
            className='field'
            value={formData.payer_email || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                payer_email: e.target.value,
              }))
            }
            placeholder='landlord@example.co.uk'
          />
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 12,
              color: 'var(--me-ink-3)',
            }}
          >
            We&apos;ll invite them to fund the job in escrow before work starts.
          </p>
        </div>
      )}
    </div>
  );
}
