'use client';

/**
 * RunningLateButton — sibling action to "Start work" on the
 * `/contractor/jobs/[id]` stage action card.
 *
 * Posts a templated system message to the existing job message
 * thread so the homeowner sees the new ETA in chat, and surfaces a
 * push notification via the same downstream pipeline that handles
 * other lifecycle messages. Picker is intentionally pre-set to
 * common deltas (+10 / +20 / +30 / +60 mins) to keep the contractor
 * one tap away from a heads-up.
 *
 * No new DB columns — we lean on the existing `messages` thread.
 */

import React, { useState } from 'react';
import { Clock, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

interface RunningLateButtonProps {
  jobId: string;
  /**
   * If the contractor previously kicked off "On my way" we have a
   * trip with an estimated arrival time. If not, the picker offsets
   * from `now()`.
   */
  previousEtaIso?: string | null;
}

const PRESET_DELAYS = [10, 20, 30, 60] as const;

export function RunningLateButton({
  jobId,
  previousEtaIso,
}: RunningLateButtonProps) {
  const [open, setOpen] = useState(false);
  const [delay, setDelay] = useState<number>(20);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const base = previousEtaIso
        ? new Date(previousEtaIso).getTime()
        : Date.now();
      const newEta = new Date(base + delay * 60 * 1000);
      const etaLabel = newEta.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const lines = [
        `Heads up — I'm running about ${delay} minute${delay === 1 ? '' : 's'} late.`,
        `New ETA: ${etaLabel}.`,
      ];
      if (note.trim()) {
        lines.push('');
        lines.push(note.trim());
      }
      lines.push('');
      lines.push('Apologies for the inconvenience.');

      const csrf = await getCsrfHeaders();
      const res = await fetch(`/api/messages/threads/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrf },
        credentials: 'include',
        body: JSON.stringify({
          content: lines.join('\n'),
          messageType: 'text',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(body.error || 'Failed to send late notice');
      }
      toast.success(`Homeowner notified — new ETA ${etaLabel}`);
      setOpen(false);
      setNote('');
    } catch (err) {
      logger.error('Error sending running-late notice', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to notify homeowner'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='btn btn-secondary btn-sm'
      >
        <Clock size={13} strokeWidth={1.75} />
        I&apos;m running late
      </button>

      {open ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => !sending && setOpen(false)}
        >
          <div
            className='card card-pad'
            style={{ maxWidth: 420, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className='col' style={{ gap: 14 }}>
              <div className='between' style={{ alignItems: 'center' }}>
                <h3 className='t-h3' style={{ margin: 0 }}>
                  I&apos;m running late
                </h3>
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  onClick={() => !sending && setOpen(false)}
                  aria-label='Close'
                  disabled={sending}
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              </div>

              <p className='t-body' style={{ fontSize: 13 }}>
                Pick a delay and we&apos;ll message the homeowner with the new
                ETA. Posts in the job thread so they get a push.
              </p>

              <div className='col' style={{ gap: 6 }}>
                <span className='t-meta' style={{ fontWeight: 600 }}>
                  How much later?
                </span>
                <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
                  {PRESET_DELAYS.map((d) => (
                    <button
                      key={d}
                      type='button'
                      onClick={() => setDelay(d)}
                      className={`chip ${delay === d ? 'on' : ''}`}
                    >
                      +{d} min
                    </button>
                  ))}
                </div>
              </div>

              <div className='col' style={{ gap: 6 }}>
                <label
                  htmlFor='late-note'
                  className='t-meta'
                  style={{ fontWeight: 600 }}
                >
                  Optional reason
                </label>
                <textarea
                  id='late-note'
                  className='field'
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder='Traffic on the A40 / previous job overran…'
                  rows={2}
                  maxLength={500}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div
                className='row'
                style={{ gap: 8, justifyContent: 'flex-end' }}
              >
                <button
                  type='button'
                  className='btn btn-secondary btn-sm'
                  onClick={() => setOpen(false)}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  className='btn btn-primary btn-sm'
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2
                      size={13}
                      strokeWidth={1.75}
                      className='animate-spin'
                    />
                  ) : null}
                  Notify homeowner
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
