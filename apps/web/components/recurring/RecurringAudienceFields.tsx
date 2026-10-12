'use client';

import { useState } from 'react';

export interface AudienceValue {
  category: string;
  preferred_contractor_id: string | null;
  notification_audience: 'matching' | 'preferred';
}

export const emptyAudience: AudienceValue = {
  category: 'handyman',
  preferred_contractor_id: null,
  notification_audience: 'matching',
};

export function RecurringAudienceFields({
  propertyId,
  value,
  onChange,
}: {
  propertyId: string;
  value: AudienceValue;
  onChange: (value: AudienceValue) => void;
}) {
  const [contractors, setContractors] = useState<
    { id: string; name: string }[]
  >([]);

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/properties/${propertyId}/recurring-contractors`
      );

      if (!response.ok)
        throw new Error('Could not load your previously hired contractors.');

      const data = await response.json();

      if (!Array.isArray(data.contractors))
        throw new Error('Could not load contractors.');

      setContractors(data.contractors);

      if (!data.contractors.length)
        setError(
          'No previously hired contractors are available for this property owner.'
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load contractors.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <fieldset className='space-y-3 rounded-lg border border-slate-200 p-3'>
      <legend className='px-1 font-medium'>Contractor notifications</legend>

      <label className='block text-sm'>
        Trade category
        <select
          aria-label='Trade category'
          className='mt-1 w-full rounded border p-2'
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
        >
          {[
            'plumbing',
            'electrical',
            'heating',
            'carpentry',
            'painting',
            'roofing',
            'flooring',
            'gardening',
            'cleaning',
            'handyman',
            'hvac',
            'pest_control',
            'other',
          ].map((c) => (
            <option key={c} value={c}>
              {c.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>

      <label className='block text-sm'>
        Who should be alerted?
        <select
          aria-label='Notification audience'
          className='mt-1 w-full rounded border p-2'
          value={value.notification_audience}
          onChange={(e) =>
            onChange({
              ...value,
              notification_audience: e.target
                .value as AudienceValue['notification_audience'],
              preferred_contractor_id: null,
            })
          }
        >
          <option value='matching'>Matching local contractors</option>
          <option value='preferred'>My chosen favourite only</option>
        </select>
      </label>

      {value.notification_audience === 'preferred' && (
        <>
          <button
            type='button'
            className='text-sm underline'
            disabled={!propertyId || loading}
            onClick={load}
          >
            {loading ? 'Loading…' : 'Load previously hired contractors'}
          </button>

          <label className='block text-sm'>
            Favourite contractor
            <select
              required
              aria-label='Favourite contractor'
              className='mt-1 w-full rounded border p-2'
              value={value.preferred_contractor_id ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  preferred_contractor_id: e.target.value || null,
                })
              }
            >
              <option value=''>Choose a contractor</option>

              {value.preferred_contractor_id &&
                !contractors.some(
                  (c) => c.id === value.preferred_contractor_id
                ) && (
                  <option value={value.preferred_contractor_id}>
                    Saved contractor (load names)
                  </option>
                )}

              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {error && (
        <p role='alert' className='text-sm text-red-700'>
          {error}
        </p>
      )}

      <p className='text-xs text-slate-600'>
        Alerts go only to available contractors covering the property and
        matching this trade. If none match, no alerts are sent. The job stays
        open for bids. This does not book or pay a contractor.
      </p>
    </fieldset>
  );
}
