'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

interface PropertyInfo {
  property_name: string;
  address: string;
}
const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'heating', label: 'Heating / Boiler' },
  { value: 'structural', label: 'Structural' },
  { value: 'damp_mould', label: 'Damp & Mould' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'door_window', label: 'Doors & Windows' },
  { value: 'roof_guttering', label: 'Roof & Guttering' },
  { value: 'garden_exterior', label: 'Garden & Exterior' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'general', label: 'General / Other' },
] as const;

const URGENCIES = [
  {
    value: 'low',
    label: 'Low',
    description: 'Minor issue, no immediate impact',
  },
  { value: 'medium', label: 'Medium', description: 'Affects everyday use' },
  {
    value: 'high',
    label: 'High',
    description: 'Significant disruption or worsening damage',
  },
  {
    value: 'emergency',
    label: 'Emergency',
    description: 'Immediate danger or serious damage',
  },
];
const input =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-7';
const button =
  'rounded-xl bg-[#2d6a5b] px-5 py-3 font-semibold text-white hover:bg-[#235346] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 disabled:opacity-60';

export function TenantReportForm({ token }: { token: string }) {
  const [state, setState] = useState<
    'loading' | 'ready' | 'submitting' | 'success' | 'unavailable' | 'invalid'
  >('loading');
  const [attempt, setAttempt] = useState(0);
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('general');
  const [urgency, setUrgency] = useState('medium');
  const [description, setDescription] = useState('');
  const [reportId, setReportId] = useState('');
  const [conversationUrl, setConversationUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setState('loading');
    async function load() {
      try {
        const response = await fetch(
          '/api/report/' + encodeURIComponent(token),
          { signal: controller.signal, cache: 'no-store' }
        );
        if (!active) return;
        if (response.status === 404 || response.status === 410) {
          setState('invalid');
          return;
        }
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json();
        if (!data.property) throw new Error('Missing property');
        if (active) {
          setProperty(data.property);
          setState('ready');
        }
      } catch {
        if (active) setState('unavailable');
      } finally {
        clearTimeout(timer);
      }
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, attempt]);

  useEffect(() => {
    if (state === 'success') resultHeading.current?.focus();
  }, [state]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setState('submitting');
    setError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('/api/report/' + encodeURIComponent(token), {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_name: name.trim(),
          reporter_phone: phone.trim() || undefined,
          reporter_email: email.trim() || undefined,
          reporter_unit: unit.trim() || undefined,
          category,
          urgency,
          description: description.trim(),
        }),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? 'Too many attempts. Please wait a minute before trying again.'
            : response.status === 404 || response.status === 410
              ? 'This link is no longer available. Contact your property manager.'
              : 'Your report could not be confirmed. Your details are still here. Please try again.'
        );
      }
      const data = await response.json();
      setReportId(data.report_id || '');
      // Only accept the expected local receipt route, never an arbitrary API-supplied URL.
      setConversationUrl(
        typeof data.conversation_url === 'string' &&
          /^\/maintenance\/reports\/[a-f0-9-]+#[a-f0-9]{64}$/.test(
            data.conversation_url
          )
          ? data.conversation_url
          : ''
      );
      setState('success');
    } catch (reason) {
      setError(
        reason instanceof Error &&
          reason.name !== 'AbortError' &&
          !(reason instanceof TypeError)
          ? reason.message
          : 'We could not confirm submission. It may have reached your property manager. Check with them before sending it again.'
      );
      setState('ready');
    } finally {
      clearTimeout(timer);
      busy.current = false;
    }
  }

  if (state === 'loading')
    return (
      <div role='status' className={card + ' text-center py-16'}>
        <Loader2
          aria-hidden='true'
          className='mx-auto mb-4 animate-spin text-emerald-700'
        />
        Opening your reporting link...
      </div>
    );
  if (state === 'invalid' || state === 'unavailable')
    return (
      <section className={card + ' text-center'}>
        <h1 className='text-2xl font-semibold'>
          {state === 'invalid'
            ? 'This reporting link is unavailable'
            : 'We could not load the form'}
        </h1>
        <p className='my-4 text-slate-600'>
          {state === 'invalid'
            ? 'Ask your property manager for a new reporting link.'
            : 'There may be a connection or service problem. You can try again.'}
        </p>
        {state === 'unavailable' && (
          <button className={button} onClick={() => setAttempt((v) => v + 1)}>
            Try again
          </button>
        )}
      </section>
    );
  if (state === 'success')
    return (
      <section className={card + ' mx-auto max-w-2xl'}>
        <CheckCircle2
          aria-hidden='true'
          className='mb-4 h-10 w-10 text-emerald-700'
        />
        <h1
          ref={resultHeading}
          tabIndex={-1}
          className='text-3xl font-semibold'
        >
          Your report has been received
        </h1>
        <p className='mt-3 text-slate-600'>
          Your property manager can now review the issue. A repair appointment
          has not been booked.
        </p>
        {reportId && (
          <p className='my-4 break-all text-sm text-slate-600'>
            Report reference: <span className='font-mono'>{reportId}</span>
          </p>
        )}
        {conversationUrl ? (
          <div className='my-6 rounded-xl bg-emerald-50 p-5'>
            <h2 className='font-semibold'>Keep your private update link</h2>
            <p className='my-3 text-sm text-slate-700'>
              Use this link to view replies and send more details without an
              account. Anyone with the link can access this conversation, so
              keep it private.
            </p>
            <div className='flex flex-wrap gap-3'>
              <a href={conversationUrl} className={button}>
                View report and replies
              </a>
              <button
                type='button'
                className='rounded-xl border border-emerald-800 px-4 py-3 font-medium'
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      new URL(conversationUrl, window.location.origin).href
                    );
                    setCopied(true);
                  } catch {
                    setError(
                      'Open your report and save the page address to keep your link.'
                    );
                  }
                }}
              >
                Copy private link
              </button>
            </div>
            <p role='status' className='mt-2 text-sm'>
              {copied ? 'Private link copied.' : error}
            </p>
          </div>
        ) : (
          <p className='my-5 text-slate-600'>
            Keep your report reference and contact your property manager for
            updates.
          </p>
        )}
        <button
          className='mt-3 font-semibold text-emerald-800 underline underline-offset-4'
          onClick={() => {
            setDescription('');
            setCategory('general');
            setUrgency('medium');
            setConversationUrl('');
            setReportId('');
            setCopied(false);
            setError('');
            setState('ready');
          }}
        >
          Report another issue
        </button>
      </section>
    );

  return (
    <div>
      <div className='mb-7'>
        <p className='mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-800'>
          Tenant reporting
        </p>
        <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
          Tell us what needs fixing
        </h1>
        <p className='mt-3 text-slate-600'>
          Send the details to your property manager. No account needed.
        </p>
      </div>
      <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]'>
        <form
          onSubmit={submit}
          className='min-w-0 space-y-5'
          aria-busy={state === 'submitting'}
        >
          {error && (
            <div
              role='alert'
              className='rounded-xl border border-red-200 bg-red-50 p-4 text-red-800'
            >
              {error}
            </div>
          )}
          <fieldset disabled={state === 'submitting'} className={card}>
            <legend className='sr-only'>Issue details</legend>
            <h2 className='mb-5 text-xl font-semibold'>
              1. What is the issue?
            </h2>
            <label className='block text-sm font-medium' htmlFor='category'>
              Category
              <select
                id='category'
                className={input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              className='mt-5 block text-sm font-medium'
              htmlFor='description'
            >
              Describe the problem{' '}
              <span className='text-slate-500'>(required)</span>
              <textarea
                id='description'
                className={input + ' min-h-36 resize-y'}
                required
                minLength={10}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-describedby='description-help'
                placeholder='Where is the problem? When did it start? How is it affecting you?'
              />
            </label>
            <p id='description-help' className='mt-2 text-sm text-slate-500'>
              At least 10 characters. {description.length.toLocaleString()} /
              5,000
            </p>
            <label className='mt-5 block text-sm font-medium' htmlFor='unit'>
              Flat or unit <span className='text-slate-500'>(optional)</span>
              <input
                id='unit'
                className={input}
                maxLength={120}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder='For example, Flat 2A'
              />
            </label>
          </fieldset>
          <fieldset disabled={state === 'submitting'} className={card}>
            <legend className='sr-only'>Urgency</legend>
            <h2 className='mb-2 text-xl font-semibold'>2. How urgent is it?</h2>
            <p className='mb-4 text-sm text-slate-600'>
              This helps your property manager prioritise. Response times are
              not guaranteed.
            </p>
            <div className='grid gap-3 sm:grid-cols-2'>
              {URGENCIES.map((option) => (
                <label
                  key={option.value}
                  className={
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 ' +
                    (urgency === option.value
                      ? 'border-emerald-700 bg-emerald-50'
                      : 'border-slate-200')
                  }
                >
                  <input
                    type='radio'
                    name='urgency'
                    value={option.value}
                    checked={urgency === option.value}
                    onChange={(e) => setUrgency(e.target.value)}
                    className='mt-1 h-4 w-4 accent-emerald-800'
                  />
                  <span>
                    <span className='block font-semibold'>{option.label}</span>
                    <span className='mt-1 block text-sm text-slate-600'>
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {urgency === 'emergency' && (
              <p
                role='alert'
                className='mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950'
              >
                Do not wait for a reply here if there is immediate danger.
                Contact the appropriate emergency service and your property
                manager using their emergency contact details.
              </p>
            )}
          </fieldset>
          <fieldset disabled={state === 'submitting'} className={card}>
            <legend className='sr-only'>Contact details</legend>
            <h2 className='mb-2 text-xl font-semibold'>
              3. How can we contact you?
            </h2>
            <p className='mb-5 text-sm text-slate-600'>
              Phone and email are optional. You will receive a private link for
              replies after submitting.
            </p>
            <label className='block text-sm font-medium' htmlFor='name'>
              Your name <span className='text-slate-500'>(required)</span>
              <input
                id='name'
                autoComplete='name'
                required
                minLength={2}
                maxLength={200}
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className='mt-5 grid gap-5 sm:grid-cols-2'>
              <label className='block text-sm font-medium' htmlFor='phone'>
                Phone (optional)
                <input
                  id='phone'
                  autoComplete='tel'
                  type='tel'
                  maxLength={50}
                  className={input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label className='block text-sm font-medium' htmlFor='email'>
                Email (optional)
                <input
                  id='email'
                  autoComplete='email'
                  type='email'
                  maxLength={254}
                  className={input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <p className='text-sm leading-relaxed text-slate-600'>
            Your report and contact details are shared with your property
            manager to handle this issue. Read our{' '}
            <a
              href='/privacy'
              className='font-medium text-emerald-800 underline'
            >
              privacy policy
            </a>
            .
          </p>
          <button
            type='submit'
            className={
              button + ' flex w-full items-center justify-center gap-2'
            }
            disabled={
              state === 'submitting' ||
              name.trim().length < 2 ||
              description.trim().length < 10
            }
          >
            {state === 'submitting' && (
              <Loader2 aria-hidden='true' className='h-5 w-5 animate-spin' />
            )}
            {state === 'submitting'
              ? 'Sending your report...'
              : 'Send maintenance report'}
          </button>
        </form>
        <aside className='order-first space-y-4 lg:order-last'>
          {property && (
            <div className={card}>
              <MapPin
                aria-hidden='true'
                className='mb-3 h-5 w-5 text-emerald-800'
              />
              <p className='text-sm text-slate-600'>Reporting an issue at</p>
              <h2 className='mt-1 font-semibold'>{property.property_name}</h2>
              <p className='mt-1 text-sm text-slate-600'>{property.address}</p>
            </div>
          )}
          <div className='rounded-2xl bg-[#e4eee8] p-5'>
            <ShieldCheck aria-hidden='true' className='mb-3 h-5 w-5' />
            <h2 className='font-semibold'>What happens next?</h2>
            <ol className='mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700'>
              <li>Your property manager reviews the report.</li>
              <li>Keep your private link to view replies.</li>
              <li>They can discuss access and any next steps with you.</li>
            </ol>
          </div>
          <p className='flex gap-2 px-1 text-sm leading-relaxed text-slate-600'>
            <AlertTriangle
              aria-hidden='true'
              className='mt-1 h-4 w-4 shrink-0'
            />
            This form is not an emergency response service.
          </p>
        </aside>
      </div>
    </div>
  );
}
