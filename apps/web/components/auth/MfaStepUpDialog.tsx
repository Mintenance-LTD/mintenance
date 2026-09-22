'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
}

/** Mount only while verification is requested, so codes never survive closing. */
export function MfaStepUpDialog({ onCancel, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'totp' | 'backup_code'>('totp');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const value = code.trim();
    if (
      (method === 'totp' && !/^\d{6}$/.test(value)) ||
      value.length < 6 ||
      value.length > 16
    ) {
      setError('Enter your six-digit authenticator code or full backup code.');
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetchWithCsrf('/api/auth/mfa/step-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value, method, maxAgeMinutes: 15 }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || response.status === 202 || data?.success !== true) {
        const message =
          typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(
          typeof message === 'string'
            ? message
            : 'Verification was not confirmed. Please try again.'
        );
        return;
      }
      setCode('');
      onSuccess();
    } catch {
      setError(
        'Unable to verify your code. Check your connection and try again.'
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !inFlight.current) onCancel();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (inFlight.current) event.preventDefault();
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Confirm your identity</DialogTitle>
          <DialogDescription>
            Verify your identity to continue the selected administrator action.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='secondary'
              aria-pressed={method === 'totp'}
              disabled={submitting}
              onClick={() => {
                setMethod('totp');
                setCode('');
                setError(null);
              }}
            >
              Authenticator
            </Button>
            <Button
              type='button'
              variant='secondary'
              aria-pressed={method === 'backup_code'}
              disabled={submitting}
              onClick={() => {
                setMethod('backup_code');
                setCode('');
                setError(null);
              }}
            >
              Backup code
            </Button>
          </div>
          <label
            htmlFor='mfa-step-up-code'
            className='block text-sm font-medium'
          >
            Verification code
          </label>
          <Input
            id='mfa-step-up-code'
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete='one-time-code'
            inputMode={method === 'totp' ? 'numeric' : 'text'}
            maxLength={16}
            disabled={submitting}
            aria-invalid={!!error}
            aria-describedby={error ? 'mfa-step-up-error' : undefined}
          />
          {error ? (
            <p
              id='mfa-step-up-error'
              role='alert'
              className='text-sm text-red-700'
            >
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              disabled={submitting}
              onClick={onCancel}
            >
              Cancel verification
            </Button>
            <Button type='submit' disabled={submitting || !code.trim()}>
              {submitting ? 'Verifying…' : 'Verify and continue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
