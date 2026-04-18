'use client';

/**
 * PushTokenCoverage — small client widget that polls
 * /api/admin/retention/push-token-coverage and shows the single number
 * that tells us whether the mobile push-registration fix is reaching
 * devices.
 *
 * R1 move #13.
 */

import { useEffect, useState } from 'react';
import { Smartphone, Users } from 'lucide-react';
import { AdminCard } from '@/components/admin/AdminCard';

interface Coverage {
  total_users_with_token: number;
  total_contractors: number;
  total_homeowners: number;
  contractor_coverage_pct: number;
  last_registration_at: string | null;
}

export function PushTokenCoverage() {
  const [data, setData] = useState<Coverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/retention/push-token-coverage', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = (await res.json()) as Coverage;
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminCard>
      <div className='mb-4'>
        <h3 className='font-semibold text-gray-900'>
          Mobile push-token coverage
        </h3>
        <p className='text-xs text-gray-500 mt-1'>
          Devices that registered an Expo token (end-to-end proof the mobile fix
          ships).
        </p>
      </div>
      {loading && (
        <div className='text-sm text-gray-500'>Loading coverage…</div>
      )}
      {error && !loading && (
        <div className='text-sm text-rose-600'>Failed to load: {error}</div>
      )}
      {data && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <Cell
            icon={<Smartphone className='w-4 h-4' />}
            label='Users with token'
            value={data.total_users_with_token.toLocaleString()}
          />
          <Cell
            icon={<Users className='w-4 h-4' />}
            label='Total contractors'
            value={data.total_contractors.toLocaleString()}
          />
          <Cell
            icon={<Users className='w-4 h-4' />}
            label='Total homeowners'
            value={data.total_homeowners.toLocaleString()}
          />
          <Cell
            icon={<Smartphone className='w-4 h-4' />}
            label='Blended coverage'
            value={`${data.contractor_coverage_pct.toFixed(1)}%`}
            highlight={data.total_users_with_token === 0 ? 'bad' : 'good'}
          />
          {data.last_registration_at && (
            <div className='col-span-2 md:col-span-4 text-xs text-gray-500'>
              Last registration:{' '}
              {new Date(data.last_registration_at).toLocaleString('en-GB')}
            </div>
          )}
          {data.total_users_with_token === 0 && (
            <div className='col-span-2 md:col-span-4 text-xs text-rose-600'>
              No push tokens registered yet. Confirm the mobile app build
              (commit 8fed54ed) has shipped to users.
            </div>
          )}
        </div>
      )}
    </AdminCard>
  );
}

function Cell({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: 'good' | 'bad';
}) {
  const tone =
    highlight === 'good'
      ? 'text-emerald-700'
      : highlight === 'bad'
        ? 'text-rose-600'
        : 'text-gray-900';
  return (
    <div className='rounded-xl border border-gray-200 bg-white p-4'>
      <div className='flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1'>
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default PushTokenCoverage;
