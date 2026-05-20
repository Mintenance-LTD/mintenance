/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Plus, MapPin, ArrowRight, Building2, Star } from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

interface PropertyStats {
  id: string;
  property_name: string | null;
  address: string | null;
  property_type?: string | null;
  is_primary?: boolean | null;
  is_favorited?: boolean;
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
  lastServiceDate: string | null;
  photos?: string[] | null;
}

interface Props {
  properties: PropertyStats[];
  propertyLimit: number | 'unlimited';
}

const formatGBP = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);

const formatJobs = (active: number, done: number): string => {
  if (active === 0 && done === 0) return 'No jobs yet';
  const parts: string[] = [];
  if (active > 0) parts.push(`${active} active`);
  if (done > 0) parts.push(`${done} done`);
  return parts.join(' · ');
};

function PropertyCard({ p }: { p: PropertyStats }) {
  const photo = p.photos?.[0] ?? null;
  return (
    <article className='card' style={{ overflow: 'hidden' }}>
      <div
        style={{
          height: 160,
          background: 'var(--me-bg-2)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={p.property_name ?? p.address ?? 'Property'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <Building2
            size={36}
            strokeWidth={1.25}
            style={{ color: 'var(--me-ink-3)' }}
          />
        )}
        {p.is_primary ? (
          <span
            className='badge badge-brand'
            style={{ position: 'absolute', top: 12, left: 12 }}
          >
            <Star size={11} strokeWidth={2} /> Primary
          </span>
        ) : null}
      </div>
      <div className='card-pad col' style={{ gap: 10 }}>
        <div className='col' style={{ gap: 2 }}>
          <h3 className='t-h3' style={{ fontSize: 20 }}>
            {p.property_name || p.address || 'Untitled property'}
          </h3>
          <div
            className='t-meta'
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <MapPin size={11} strokeWidth={1.75} />
            {p.address || 'No address'}
          </div>
        </div>
        <div
          className='row'
          style={{
            gap: 18,
            paddingTop: 8,
            borderTop: '1px solid var(--me-line-2)',
            flexWrap: 'wrap',
          }}
        >
          <div className='col' style={{ gap: 0 }}>
            <div className='t-meta'>Jobs</div>
            <div className='me-list-amount' style={{ fontSize: 18 }}>
              {formatJobs(p.activeJobs, p.completedJobs)}
            </div>
          </div>
          <div className='col' style={{ gap: 0 }}>
            <div className='t-meta'>Total spent</div>
            <div className='me-list-amount' style={{ fontSize: 18 }}>
              {p.totalSpent > 0 ? formatGBP(p.totalSpent) : '—'}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <Link
            href={`/properties/${p.id}`}
            className='btn btn-secondary btn-sm'
          >
            Open <ArrowRight size={13} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function MintEditorialProperties({ properties, propertyLimit }: Props) {
  const atLimit =
    propertyLimit !== 'unlimited' && properties.length >= propertyLimit;
  const limitLabel =
    propertyLimit === 'unlimited'
      ? null
      : `${properties.length} of ${propertyLimit} properties`;

  return (
    <HomeownerPageWrapper>
      <div className='between' style={{ marginBottom: 18 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Your properties</h1>
          <p className='t-body'>
            Keep maintenance, jobs and documents in one place across every home
            you manage.
          </p>
        </div>
        <div className='row' style={{ gap: 8 }}>
          {limitLabel ? <span className='t-meta'>{limitLabel}</span> : null}
          <Link
            href='/properties/add'
            className='btn btn-primary btn-sm'
            aria-disabled={atLimit || undefined}
            style={{
              pointerEvents: atLimit ? 'none' : undefined,
              opacity: atLimit ? 0.5 : 1,
            }}
          >
            <Plus size={13} strokeWidth={2} /> Add property
          </Link>
        </div>
      </div>

      {properties.length === 0 ? (
        <div
          className='card'
          style={{ padding: '56px 24px', textAlign: 'center' }}
        >
          <p className='t-body' style={{ marginBottom: 12 }}>
            No properties yet. Add your first one — that's how every job and
            maintenance record stays tied to the right address.
          </p>
          <Link href='/properties/add' className='btn btn-primary'>
            <Plus size={14} strokeWidth={2} /> Add your first property
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 18,
          }}
        >
          {properties.map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </HomeownerPageWrapper>
  );
}
