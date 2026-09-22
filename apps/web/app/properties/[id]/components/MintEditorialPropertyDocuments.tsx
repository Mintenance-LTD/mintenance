'use client';
import { useState } from 'react';
import Link from 'next/link';
export interface PropertyCertificateRecord {
  id: string;
  cert_type: string;
  certificate_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  issuer_name: string | null;
}
export function MintEditorialPropertyDocuments({
  certificates,
  canManage = true,
}: {
  certificates: PropertyCertificateRecord[];
  canManage?: boolean;
}) {
  const [query, setQuery] = useState('');
  const filtered = certificates.filter((cert) =>
    [cert.cert_type, cert.certificate_number, cert.issuer_name].some((value) =>
      value?.toLowerCase().includes(query.trim().toLowerCase())
    )
  );
  return (
    <section className='card card-pad'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h2 className='t-h2'>Certificate records</h2>
          <p className='t-body'>
            {certificates.length} recorded for this property. A completed job is
            not proof of payment or a receipt.
          </p>
        </div>
        {canManage ? (
          <Link href='/properties/compliance' className='btn btn-secondary'>
            Manage certificates
          </Link>
        ) : null}
      </div>
      <label className='mt-5 block'>
        Search certificates
        <input
          className='field mt-2 w-full'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Type, number or issuer'
        />
      </label>
      {filtered.length === 0 ? (
        <p className='mt-5'>
          {certificates.length === 0
            ? 'No certificate records have been added for this property.'
            : 'No certificates match your search.'}
        </p>
      ) : (
        <ul className='mt-5 divide-y divide-gray-200'>
          {filtered.map((cert) => (
            <li key={cert.id} className='py-4'>
              <h3 className='font-semibold'>
                {cert.cert_type.replace(/_/g, ' ')}
              </h3>
              <dl className='mt-2 grid gap-2 text-sm sm:grid-cols-2'>
                <div>
                  <dt>Certificate number</dt>
                  <dd>{cert.certificate_number || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Issuer</dt>
                  <dd>{cert.issuer_name || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Issued</dt>
                  <dd>{cert.issued_date || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Expiry</dt>
                  <dd>{cert.expiry_date || 'Not recorded'}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
      <p className='mt-5 text-sm text-gray-600'>
        Payment records are available in{' '}
        <Link href='/payments' className='underline'>
          Payments
        </Link>
        . Uploaded files and certificate records are separate evidence.
      </p>
    </section>
  );
}
