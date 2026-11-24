'use client';

import { useEffect, useRef, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { clientErrorMessage } from '@/lib/errors/client-message';
import {
  formatUKSchedule,
  ukDateTimeInput,
  ukDateTimeToISO,
} from '@/lib/scheduling/uk-date-time';

interface WorkWindow {
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  scheduled_duration_hours: number | null;
}

type Decision = 'accepted' | 'declined' | 'withdrawn';

interface Proposal {
  id: string;
  state: 'pending' | 'expired' | Decision;
  startsAt: string;
  endsAt: string | null;
  durationHours: number | null;
  yourProposal: boolean;
  canRespond: boolean;
  awaitingRole: 'homeowner' | 'contractor';
}

interface Schedule extends WorkWindow {
  active: boolean;
  proposal: Proposal | null;
}

interface JobSchedulingProps {
  initialEditing?: boolean;
  jobId: string;
  userRole: 'homeowner' | 'contractor';
  userId: string;
  currentSchedule?: WorkWindow;
  contractStatus?: 'none' | 'pending' | 'accepted';
}

function WindowDates({
  start,
  end,
  duration,
}: {
  start?: string | null;
  end?: string | null;
  duration?: number | null;
}) {
  if (!start) return <p>No work window agreed yet.</p>;
  return (
    <dl className='grid gap-2 sm:grid-cols-3'>
      <div>
        <dt className='font-semibold'>Start (UK)</dt>
        <dd>{formatUKSchedule(start)}</dd>
      </div>
      {end && (
        <div>
          <dt className='font-semibold'>End (UK)</dt>
          <dd>{formatUKSchedule(end)}</dd>
        </div>
      )}
      {duration && (
        <div>
          <dt className='font-semibold'>Estimated duration</dt>
          <dd>
            {duration} {duration === 1 ? 'hour' : 'hours'}
          </dd>
        </div>
      )}
    </dl>
  );
}

export function JobScheduling({
  jobId,
  currentSchedule,
  contractStatus = 'none',
  initialEditing = false,
}: JobSchedulingProps) {
  const url = '/api/jobs/' + encodeURIComponent(jobId) + '/schedule';
  const [schedule, setSchedule] = useState<Schedule>();
  const [editing, setEditing] = useState(initialEditing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reading, setReading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const [start, setStart] = useState(
    ukDateTimeInput(currentSchedule?.scheduled_start_date)
  );
  const [end, setEnd] = useState(
    ukDateTimeInput(currentSchedule?.scheduled_end_date)
  );
  const [duration, setDuration] = useState(
    currentSchedule?.scheduled_duration_hours?.toString() ?? ''
  );

  useEffect(() => {
    if (contractStatus !== 'accepted') return;
    const controller = new AbortController();
    setReading(true);
    setLoadError(false);
    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Work window unavailable');
        const data: Schedule = await response.json();
        if (!controller.signal.aborted) setSchedule(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setReading(false);
      });
    return () => controller.abort();
  }, [contractStatus, refresh, url]);

  const current = schedule ?? currentSchedule;
  const proposal = schedule?.proposal;
  const pending = proposal?.state === 'pending' ? proposal : null;

  async function write(
    method: 'POST' | 'PATCH',
    body: object,
    message: string
  ) {
    if (busy.current || !schedule?.active || loadError || reading) return;
    busy.current = true;
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const result = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify(body),
      });
      if (!result.ok)
        throw new Error(
          clientErrorMessage(
            await result.json().catch(() => null),
            'Unable to save. Your current work window is unchanged.'
          )
        );
      setNotice(message);
      setEditing(false);
      setReading(true);
      setRefresh((count) => count + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save. Please retry.'
      );
      setReading(true);
      setRefresh((count) => count + 1);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  function propose() {
    try {
      const startsAt = ukDateTimeToISO(start);
      const endsAt = end ? ukDateTimeToISO(end) : null;
      if (endsAt && endsAt <= startsAt)
        throw new Error('End time must be after start time.');
      void write(
        'POST',
        {
          scheduled_start_date: startsAt,
          scheduled_end_date: endsAt,
          ...(duration ? { scheduled_duration_hours: Number(duration) } : {}),
        },
        'Proposal sent. The current work window stays in place until the other party accepts.'
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Choose valid UK dates.'
      );
    }
  }

  function respond(decision: Decision) {
    if (!pending) return;
    const message =
      decision === 'accepted'
        ? 'Work window accepted. The agreed dates are now in the job calendar.'
        : 'Proposal ' + decision + '. The current work window stays in place.';
    void write('PATCH', { proposalId: pending.id, decision }, message);
  }

  function openForm() {
    setStart(ukDateTimeInput(current?.scheduled_start_date));
    setEnd(ukDateTimeInput(current?.scheduled_end_date));
    setDuration(current?.scheduled_duration_hours?.toString() ?? '');
    setNotice('');
    setError('');
    setEditing(true);
  }

  return (
    <section
      id='job-schedule'
      aria-label='Current work window'
      className='card card-pad space-y-4 scroll-mt-24'
    >
      <h2 className='t-h3'>Current work window</h2>
      <WindowDates
        start={current?.scheduled_start_date}
        end={current?.scheduled_end_date}
        duration={current?.scheduled_duration_hours}
      />
      {contractStatus !== 'accepted' ? (
        <p>Both parties must sign the agreement before proposing work dates.</p>
      ) : (
        <>
          <p className='t-meta'>
            Accepted dates update the job calendar. Signed agreement dates and
            individual visits stay as they are.
          </p>
          {schedule && (
            <button
              type='button'
              disabled={reading || saving}
              className='t-meta underline'
              onClick={() => {
                setReading(true);
                setRefresh((x) => x + 1);
              }}
            >
              Refresh dates
            </button>
          )}
          {!schedule && !loadError && (
            <p role='status'>Loading work-window proposals…</p>
          )}
          {loadError && (
            <p role='alert'>
              Could not load work-window proposals.{' '}
              <button
                className='underline'
                type='button'
                onClick={() => setRefresh((x) => x + 1)}
              >
                Retry
              </button>
            </p>
          )}
          {notice && <p role='status'>{notice}</p>}
          {error && <p role='alert'>{error}</p>}
          {pending ? (
            <div className='space-y-3 rounded-lg border p-4'>
              <h3 className='font-semibold'>Proposed work window</h3>
              <WindowDates
                start={pending.startsAt}
                end={pending.endsAt}
                duration={pending.durationHours}
              />
              <p>
                {pending.canRespond
                  ? 'Waiting for your response.'
                  : 'Waiting for the ' + pending.awaitingRole + ' to respond.'}
              </p>
              {schedule?.active && !loadError && (
                <div className='flex flex-wrap gap-2'>
                  {pending.canRespond && (
                    <>
                      <button
                        type='button'
                        className='btn btn-primary'
                        disabled={saving || reading}
                        onClick={() => respond('accepted')}
                      >
                        Accept proposed dates
                      </button>
                      <button
                        type='button'
                        className='btn btn-secondary'
                        disabled={saving || reading}
                        onClick={() => respond('declined')}
                      >
                        Decline proposed dates
                      </button>
                    </>
                  )}
                  {pending.yourProposal && (
                    <button
                      type='button'
                      className='btn btn-secondary'
                      disabled={saving || reading}
                      onClick={() => respond('withdrawn')}
                    >
                      Withdraw proposal
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {proposal && (
                <p className='t-meta'>Latest proposal: {proposal.state}.</p>
              )}
              {editing && schedule?.active && !loadError ? (
                <form
                  className='space-y-3'
                  onSubmit={(event) => {
                    event.preventDefault();
                    propose();
                  }}
                >
                  <p>
                    The current window stays in place while the other party
                    reviews your proposal.
                  </p>
                  <label className='block'>
                    Start date and time (UK)
                    <input
                      className='block rounded-lg border p-2'
                      type='datetime-local'
                      required
                      value={start}
                      onChange={(event) => setStart(event.target.value)}
                    />
                  </label>
                  <label className='block'>
                    End date and time (UK)
                    <input
                      className='block rounded-lg border p-2'
                      type='datetime-local'
                      value={end}
                      onChange={(event) => setEnd(event.target.value)}
                    />
                  </label>
                  <label className='block'>
                    Estimated duration (hours)
                    <input
                      className='block rounded-lg border p-2'
                      type='number'
                      min={1}
                      step={1}
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                    />
                  </label>
                  <div className='flex gap-2'>
                    <button
                      type='submit'
                      className='btn btn-primary'
                      disabled={saving || reading}
                    >
                      {saving ? 'Sending…' : 'Send proposal'}
                    </button>
                    <button
                      type='button'
                      className='btn btn-secondary'
                      disabled={saving}
                      onClick={() => {
                        setEditing(false);
                        setError('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                schedule?.active &&
                !loadError && (
                  <button
                    type='button'
                    className='btn btn-secondary'
                    onClick={openForm}
                  >
                    Propose new dates
                  </button>
                )
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
