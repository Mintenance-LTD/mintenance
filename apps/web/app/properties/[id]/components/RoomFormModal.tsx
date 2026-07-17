'use client';

/**
 * RoomFormModal — used by PropertyRoomsSection for Add and Edit.
 *
 * Real-data-only: size_sqm is OPTIONAL; the form returns an empty
 * string when the user doesn't know, and the parent maps that to
 * `null` before sending to the API.
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { RoomType } from './PropertyRoomsSection';

const ROOM_TYPE_OPTIONS: Array<{ value: RoomType; label: string }> = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'living_room', label: 'Living room' },
  { value: 'dining_room', label: 'Dining room' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'office', label: 'Office' },
  { value: 'utility', label: 'Utility' },
  { value: 'garage', label: 'Garage' },
  { value: 'garden', label: 'Garden' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'roof', label: 'Roof' },
  { value: 'other', label: 'Other' },
];

export interface RoomFormValues {
  name: string;
  room_type: RoomType;
  size_sqm: string; // string in the form; parent coerces to number|null
  notes: string;
}

interface RoomFormModalProps {
  initial?: RoomFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: RoomFormValues) => void;
}

const DEFAULTS: RoomFormValues = {
  name: '',
  room_type: 'kitchen',
  size_sqm: '',
  notes: '',
};

export function RoomFormModal({
  initial,
  saving,
  onCancel,
  onSubmit,
}: RoomFormModalProps) {
  const [values, setValues] = useState<RoomFormValues>(initial ?? DEFAULTS);
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const nameError =
    touched && values.name.trim().length === 0 ? 'Name is required' : null;
  const sizeError =
    touched &&
    values.size_sqm !== '' &&
    (Number.isNaN(Number(values.size_sqm)) || Number(values.size_sqm) < 0)
      ? 'Size must be a positive number'
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (values.name.trim().length === 0) return;
    if (sizeError) return;
    onSubmit({
      ...values,
      name: values.name.trim(),
      notes: values.notes.trim(),
    });
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26, 37, 32, 0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--me-surface)',
          borderRadius: 14,
          boxShadow:
            'var(--me-shadow-pop, 0 4px 12px rgba(31,42,36,0.06), 0 12px 28px rgba(31,42,36,0.08))',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px 12px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--me-font-display, "Inter", sans-serif)',
              fontSize: 22,
              color: 'var(--me-ink)',
            }}
          >
            {initial ? 'Edit room' : 'Add a room'}
          </h3>
          <button
            type='button'
            aria-label='Close'
            onClick={onCancel}
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--me-ink-3)',
            }}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div
          style={{
            padding: '0 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <label
              htmlFor='room-name'
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--me-ink-2)',
                marginBottom: 4,
              }}
            >
              Name
            </label>
            <input
              ref={nameRef}
              id='room-name'
              type='text'
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              placeholder='e.g. Master bedroom, Family bathroom'
              maxLength={80}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                borderRadius: 'var(--me-radius-input, 10px)',
                border: `1px solid ${
                  nameError ? 'var(--me-err-fg)' : 'var(--me-line)'
                }`,
                background: 'var(--me-surface)',
                color: 'var(--me-ink)',
                outline: 'none',
              }}
            />
            {nameError ? (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  color: 'var(--me-err-fg)',
                }}
              >
                {nameError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor='room-type'
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--me-ink-2)',
                marginBottom: 4,
              }}
            >
              Type
            </label>
            <select
              id='room-type'
              value={values.room_type}
              onChange={(e) =>
                setValues({
                  ...values,
                  room_type: e.target.value as RoomType,
                })
              }
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                borderRadius: 'var(--me-radius-input, 10px)',
                border: '1px solid var(--me-line)',
                background: 'var(--me-surface)',
                color: 'var(--me-ink)',
                outline: 'none',
              }}
            >
              {ROOM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor='room-size'
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--me-ink-2)',
                marginBottom: 4,
              }}
            >
              Size in m²{' '}
              <span style={{ color: 'var(--me-ink-3)', fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <input
              id='room-size'
              type='number'
              inputMode='decimal'
              min={0}
              step={0.1}
              value={values.size_sqm}
              onChange={(e) =>
                setValues({ ...values, size_sqm: e.target.value })
              }
              placeholder='e.g. 12.5'
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                borderRadius: 'var(--me-radius-input, 10px)',
                border: `1px solid ${
                  sizeError ? 'var(--me-err-fg)' : 'var(--me-line)'
                }`,
                background: 'var(--me-surface)',
                color: 'var(--me-ink)',
                outline: 'none',
              }}
            />
            {sizeError ? (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  color: 'var(--me-err-fg)',
                }}
              >
                {sizeError}
              </p>
            ) : (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 11,
                  color: 'var(--me-ink-3)',
                }}
              >
                Leave blank if you don&rsquo;t know — contractors can quote a
                fixed price instead.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor='room-notes'
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--me-ink-2)',
                marginBottom: 4,
              }}
            >
              Notes{' '}
              <span style={{ color: 'var(--me-ink-3)', fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <textarea
              id='room-notes'
              value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
              placeholder='Quirks worth flagging — e.g. shower over bath, exposed brick wall, no overhead light.'
              rows={3}
              maxLength={500}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                borderRadius: 'var(--me-radius-input, 10px)',
                border: '1px solid var(--me-line)',
                background: 'var(--me-surface)',
                color: 'var(--me-ink)',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 24px 20px',
            borderTop: '1px solid var(--me-line-2)',
          }}
        >
          <button
            type='button'
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--me-radius-btn, 10px)',
              border: '1px solid var(--me-line)',
              background: 'var(--me-surface)',
              color: 'var(--me-ink-2)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--me-radius-btn, 10px)',
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add room'}
          </button>
        </div>
      </form>
    </div>
  );
}
