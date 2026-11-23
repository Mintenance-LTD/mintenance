import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, CircleAlert, Phone } from 'lucide-react';

export interface EmergencyCoverageRow {
  property_id: string;
  property_name: string | null;
  initial_responder: string | null;
  fallback_responder: string | null;
  emergency_phone: string | null;
  has_active_link: boolean;
}

export function EmergencyCoverage({
  properties,
}: {
  properties: EmergencyCoverageRow[] | null;
}) {
  return (
    <section aria-labelledby='emergency-coverage'>
      <h2
        id='emergency-coverage'
        className='text-xl font-semibold text-slate-950'
      >
        Property coverage
      </h2>
      <p className='mt-1 max-w-3xl text-sm text-slate-600'>
        Check who gets alerts and which number residents can call before sharing
        a reporting link. The first internal escalation target is 15 minutes.
        Response times vary.
      </p>
      {properties === null ? (
        <p
          role='alert'
          className='mt-4 rounded-xl bg-amber-50 p-4 text-amber-950'
        >
          Property coverage could not be confirmed. Refresh the inbox to retry.
        </p>
      ) : properties.length === 0 ? (
        <p className='mt-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-600'>
          No properties are available to you for emergency coverage review.
        </p>
      ) : (
        <ul className='mt-4 grid gap-4 lg:grid-cols-2'>
          {properties.map((property) => {
            const gaps =
              !property.initial_responder ||
              !property.fallback_responder ||
              !property.emergency_phone;
            return (
              <li
                className='rounded-2xl border border-slate-200 bg-white p-5'
                key={property.property_id}
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <h3 className='break-words font-semibold text-slate-950'>
                      {property.property_name || 'Unnamed property'}
                    </h3>
                    <p className='mt-1 text-sm text-slate-600'>
                      {property.has_active_link
                        ? 'Active reporting link'
                        : 'No active reporting link'}
                    </p>
                  </div>
                  {gaps ? (
                    <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900'>
                      <CircleAlert size={14} aria-hidden='true' /> Coverage gap
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900'>
                      <CheckCircle2 size={14} aria-hidden='true' /> Coverage
                      configured
                    </span>
                  )}
                </div>
                <dl className='my-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2'>
                  <div>
                    <dt className='text-slate-600'>Initial alert</dt>
                    <dd className='mt-1 font-medium text-slate-950'>
                      {property.initial_responder ?? 'Mintenance operations'}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-slate-600'>If no one acknowledges</dt>
                    <dd className='mt-1 font-medium text-slate-950'>
                      {property.fallback_responder ?? 'Mintenance operations'}
                    </dd>
                    {!property.fallback_responder && (
                      <p className='mt-1 text-xs text-slate-600'>
                        No eligible team fallback
                      </p>
                    )}
                  </div>
                  <div className='sm:col-span-2'>
                    <dt className='text-slate-600'>
                      Emergency number shown to residents
                    </dt>
                    <dd className='mt-1 font-medium text-slate-950'>
                      {property.emergency_phone ? (
                        <a
                          className='inline-flex items-center gap-2 underline underline-offset-2'
                          href={`tel:${property.emergency_phone}`}
                        >
                          <Phone size={14} aria-hidden='true' />{' '}
                          {property.emergency_phone}
                        </a>
                      ) : (
                        'No number configured'
                      )}
                    </dd>
                  </div>
                </dl>
                <Link
                  className='inline-flex items-center gap-1 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline'
                  href={`/properties/${property.property_id}?tab=manage&manage=people`}
                >
                  Open property <ArrowUpRight size={15} aria-hidden='true' />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
