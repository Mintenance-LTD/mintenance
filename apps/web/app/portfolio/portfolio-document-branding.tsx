'use client';

import Image from 'next/image';
import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';

interface Branding {
  displayName: string;
  accentColour: string;
  logoDataUrl: string | null;
}

const hexColour = /^#[0-9a-f]{6}$/i;
const acceptedLogo = /^data:image\/(png|jpeg);base64,[a-z0-9+/]+=*$/i;
const field =
  'mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-700/30 sm:text-sm';

function readLogo(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png'].includes(file.type) ||
    !file.size ||
    file.size > 200 * 1024
  ) {
    return Promise.reject(
      new Error('Choose a PNG or JPEG logo no larger than 200 KB.')
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the logo.'));
    reader.onload = () => {
      const value = reader.result;
      if (typeof value === 'string' && acceptedLogo.test(value)) resolve(value);
      else reject(new Error('Choose a valid PNG or JPEG logo.'));
    };
    reader.readAsDataURL(file);
  });
}

export function PortfolioDocumentBranding({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-labelledby={id}
      className='mt-5 min-w-0 rounded-xl border border-slate-200 p-4'
    >
      <h2 id={id} className='font-semibold text-slate-900'>
        Document branding
      </h2>
      <p className='mt-1 text-sm leading-6 text-slate-600'>
        Set your agency name, accent colour and logo for new check-in and
        check-out reports. Existing documents stay as they are.
      </p>
      <button
        type='button'
        aria-expanded={open}
        aria-controls={id + '-form'}
        onClick={() => setOpen((v) => !v)}
        className='mt-2 min-h-11 rounded-lg px-2 text-sm font-semibold text-teal-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800'
      >
        {open ? 'Hide branding settings' : 'Edit document branding'}
      </button>
      <div id={id + '-form'} hidden={!open}>
        {open && <BrandingEditor key={workspaceId} workspaceId={workspaceId} />}
      </div>
    </section>
  );
}

function BrandingEditor({ workspaceId }: { workspaceId: string }) {
  const url =
    '/api/organizations/' +
    encodeURIComponent(workspaceId) +
    '/document-branding';
  const [values, setValues] = useState<Branding | null>(null);
  const [newLogo, setNewLogo] = useState<string | null | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const logo = newLogo === undefined ? values?.logoDataUrl : newLogo;
  const previewColour =
    values && hexColour.test(values.accentColour)
      ? values.accentColour
      : '#0E5545';

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await fetch(url, {
          cache: 'no-store',
          signal: abort.signal,
        });
        if (!result.ok) throw new Error('Could not load branding settings.');
        const incoming = (await result.json()) as Branding;
        if (!abort.signal.aborted) setValues(incoming);
      } catch (e) {
        if (!abort.signal.aborted)
          setError(
            e instanceof Error ? e.message : 'Could not load branding settings.'
          );
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => abort.abort();
  }, [url, reload]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values || reading || saving) return;
    setError('');
    setNotice('');
    const displayName = values.displayName.trim();
    if (displayName.length < 1 || !hexColour.test(values.accentColour)) {
      setError(
        'Enter a business name and a six-digit hex colour such as #0E5545.'
      );
      return;
    }
    setSaving(true);
    try {
      const result = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({
          displayName,
          accentColour: values.accentColour,
          logoDataUrl: newLogo,
        }),
      });
      if (!result.ok) {
        const payload = await result.json().catch(() => null);
        throw new Error(
          result.status === 400 && typeof payload?.message === 'string'
            ? payload.message
            : 'Could not save branding settings.'
        );
      }
      setValues((await result.json()) as Branding);
      setNewLogo(undefined);
      setNotice('Branding saved for new inspections.');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not save branding settings.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='mt-3'>
      {loading && (
        <p role='status' className='text-sm text-slate-600'>
          Loading branding settings…
        </p>
      )}
      {error && (
        <p role='alert' className='mb-3 text-sm text-red-800'>
          {error}
        </p>
      )}
      {!values && !loading && (
        <button
          type='button'
          className='min-h-11 text-sm font-semibold text-teal-900 underline'
          onClick={() => setReload((n) => n + 1)}
        >
          Try again
        </button>
      )}
      {values && (
        <form onSubmit={save} className='grid gap-4 lg:grid-cols-2'>
          <fieldset disabled={saving} className='min-w-0 space-y-3'>
            <legend className='sr-only'>Agency details</legend>
            <label className='block text-sm font-medium text-slate-900'>
              Business name
              <input
                className={field}
                autoComplete='organization'
                maxLength={80}
                minLength={1}
                required
                value={values.displayName}
                onChange={(e) =>
                  setValues({ ...values, displayName: e.target.value })
                }
              />
            </label>
            <label className='block text-sm font-medium text-slate-900'>
              Accent colour (hex)
              <input
                className={field}
                spellCheck={false}
                autoCapitalize='none'
                maxLength={7}
                required
                value={values.accentColour}
                onChange={(e) =>
                  setValues({ ...values, accentColour: e.target.value })
                }
              />
            </label>
            <label className='block text-sm font-medium text-slate-900'>
              Logo (optional, PNG or JPEG up to 200 KB)
              <input
                className={field}
                type='file'
                accept='image/png,image/jpeg'
                disabled={reading}
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (!file) return;
                  setReading(true);
                  setError('');
                  try {
                    setNewLogo(await readLogo(file));
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Could not read the logo.'
                    );
                  } finally {
                    setReading(false);
                  }
                }}
              />
            </label>
            {logo && (
              <button
                type='button'
                className='min-h-11 text-sm font-semibold text-teal-900 underline'
                onClick={() => setNewLogo(null)}
              >
                Remove logo
              </button>
            )}
          </fieldset>
          <div className='min-w-0 rounded-xl border border-slate-200 bg-white p-4'>
            <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
              Document header preview
            </p>
            <div
              className='mt-3 rounded-lg border border-slate-200 border-t-4 p-3'
              style={{ borderTopColor: previewColour }}
            >
              {logo && acceptedLogo.test(logo) && (
                <Image
                  src={logo}
                  alt='Agency logo preview'
                  width={120}
                  height={48}
                  className='mb-2 h-12 w-auto max-w-full object-contain'
                  unoptimized
                />
              )}
              <p className='break-words font-semibold text-slate-900'>
                {values.displayName || 'Business name'}
              </p>
              <p className='text-xs text-slate-600'>Check-in inspection</p>
            </div>
          </div>
          <div className='lg:col-span-2'>
            <button
              type='submit'
              disabled={saving || reading}
              className='min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60'
            >
              {reading ? 'Reading logo…' : saving ? 'Saving…' : 'Save branding'}
            </button>
            {notice && (
              <p role='status' className='mt-2 text-sm text-teal-900'>
                {notice}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
