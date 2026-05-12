'use client';

/**
 * Mint Editorial port of /landlord/support (Priority Support).
 *
 * Same data path + create-ticket logic as the legacy inline JSX.
 * Visual diffs:
 *   - Header → .t-h1 + .t-body, primary action button (.btn-primary)
 *   - Form → .card .card-pad with .field inputs + chip-style
 *     priority selector
 *   - Ticket cards → .card with .badge-{info,warn,ok,mute} status pills
 *   - Empty state → <MintEditorialEmptyState> primitive with Headphones
 *     icon + CTA to open the new-ticket form
 */

import React from 'react';
import { Headphones, Plus, X } from 'lucide-react';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

const STATUS_BADGE: Record<
  string,
  { label: string; tone: 'info' | 'warn' | 'ok' | 'mute' }
> = {
  open: { label: 'Open', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'warn' },
  resolved: { label: 'Resolved', tone: 'ok' },
  closed: { label: 'Closed', tone: 'mute' },
};

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

interface Props {
  tickets: Ticket[];
  loading: boolean;
  showForm: boolean;
  subject: string;
  message: string;
  priority: string;
  submitting: boolean;
  onToggleForm: () => void;
  onSubjectChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function MintEditorialSupport({
  tickets,
  loading,
  showForm,
  subject,
  message,
  priority,
  submitting,
  onToggleForm,
  onSubjectChange,
  onMessageChange,
  onPriorityChange,
  onSubmit,
}: Props) {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className='between' style={{ marginBottom: 22, gap: 16 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Priority support</h1>
          <p className='t-body'>
            Open a ticket for hands-on help — billing, contractor disputes,
            anything that needs a human.
          </p>
        </div>
        <button
          type='button'
          className='btn btn-primary'
          onClick={onToggleForm}
        >
          <Plus size={14} strokeWidth={1.75} />
          {showForm ? 'Cancel' : 'New ticket'}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className='card card-pad'
          style={{ marginBottom: 18 }}
        >
          <div className='between' style={{ marginBottom: 12 }}>
            <h2 className='t-h4'>New support ticket</h2>
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              onClick={onToggleForm}
              aria-label='Close form'
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className='col' style={{ gap: 10 }}>
            <input
              required
              type='text'
              className='field'
              placeholder='Subject'
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
            />
            <textarea
              required
              className='field'
              placeholder='Describe your issue — include job IDs / contractor names if relevant.'
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={5}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div>
              <div className='t-eyebrow' style={{ marginBottom: 8 }}>
                Priority
              </div>
              <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type='button'
                    className={'chip ' + (priority === p ? 'on' : '')}
                    onClick={() => onPriorityChange(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={submitting || !subject.trim() || !message.trim()}
              style={{ alignSelf: 'flex-start' }}
            >
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div
          className='card card-pad'
          style={{ textAlign: 'center', padding: '40px 20px' }}
        >
          <p className='t-body'>Loading tickets…</p>
        </div>
      ) : tickets.length === 0 ? (
        <MintEditorialEmptyState
          icon={Headphones}
          title='No support tickets yet'
          body='Open a ticket and our team will get back to you within one business day. Faster on Priority and Pro plans.'
          cta={
            !showForm
              ? { label: 'Open your first ticket', onClick: onToggleForm }
              : undefined
          }
        />
      ) : (
        <div className='col' style={{ gap: 10 }}>
          {tickets.map((ticket) => {
            const badge = STATUS_BADGE[ticket.status] || STATUS_BADGE.open;
            return (
              <div key={ticket.id} className='card card-pad'>
                <div
                  className='between'
                  style={{ alignItems: 'flex-start', gap: 12 }}
                >
                  <div className='col' style={{ gap: 2, minWidth: 0, flex: 1 }}>
                    <h3
                      className='t-h4'
                      style={{ fontSize: 14, fontWeight: 600 }}
                    >
                      {ticket.subject}
                    </h3>
                    <p
                      className='t-body'
                      style={{
                        fontSize: 12,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {ticket.message}
                    </p>
                  </div>
                  <span className={`badge badge-${badge.tone}`}>
                    {badge.label}
                  </span>
                </div>
                <div
                  className='row'
                  style={{
                    gap: 12,
                    marginTop: 8,
                    fontSize: 11,
                    color: 'var(--me-ink-3)',
                  }}
                >
                  <span>
                    {new Date(ticket.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span style={{ textTransform: 'capitalize' }}>
                    Priority: {ticket.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
