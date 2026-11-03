'use client';
import Link from 'next/link';
import {
  CUSTOMER_TERMS_VERSION,
  EARLY_START_REQUEST,
  FULL_PERFORMANCE_ACKNOWLEDGEMENT,
} from '@mintenance/shared';
export interface ConsentChoices {
  termsAccepted: boolean;
  earlyStartRequested: boolean;
  fullPerformanceAcknowledged: boolean;
}
export const emptyConsent: ConsentChoices = {
  termsAccepted: false,
  earlyStartRequested: false,
  fullPerformanceAcknowledged: false,
};
export function ContractConsentChoices({
  value,
  onChange,
  homeowner,
}: {
  value: ConsentChoices;
  onChange: (v: ConsentChoices) => void;
  homeowner: boolean;
}) {
  return (
    <fieldset className='space-y-4 rounded-xl border p-4 text-sm'>
      <legend className='font-semibold'>
        Agreement and cancellation rights
      </legend>
      <p>
        The job agreement takes effect when all required parties sign. For a
        qualifying consumer service, the cancellation period ends 14 days after
        the day the agreement is made. Your exact deadline appears on the
        accepted agreement.
      </p>
      <p>
        <Link href='/terms' target='_blank'>
          Read customer terms ({CUSTOMER_TERMS_VERSION})
        </Link>{' '}
        ·{' '}
        <a href='/legal/customer-terms-2026-11-03.txt' download>
          Save a copy
        </a>
      </p>
      <label className='flex gap-3'>
        <input
          type='checkbox'
          checked={value.termsAccepted}
          onChange={(e) =>
            onChange({ ...value, termsAccepted: e.target.checked })
          }
        />
        I have read and accept the customer terms and this job agreement.
      </label>
      {homeowner && (
        <>
          <p>
            You may sign without requesting an early start. The contractor must
            then wait until the cancellation period ends. Starting work alone
            does not remove your cancellation rights.
          </p>
          <label className='flex gap-3'>
            <input
              type='checkbox'
              checked={value.earlyStartRequested}
              onChange={(e) =>
                onChange({
                  ...value,
                  earlyStartRequested: e.target.checked,
                  fullPerformanceAcknowledged:
                    e.target.checked && value.fullPerformanceAcknowledged,
                })
              }
            />
            {EARLY_START_REQUEST}
          </label>
          <label className='flex gap-3'>
            <input
              type='checkbox'
              disabled={!value.earlyStartRequested}
              checked={value.fullPerformanceAcknowledged}
              onChange={(e) =>
                onChange({
                  ...value,
                  fullPerformanceAcknowledged: e.target.checked,
                })
              }
            />
            {FULL_PERFORMANCE_ACKNOWLEDGEMENT}
          </label>
        </>
      )}
    </fieldset>
  );
}
