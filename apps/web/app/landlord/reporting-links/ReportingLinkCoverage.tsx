import Link from 'next/link';

export type ReportingCoverage = {
  propertyId: string;
  hasEmergencyPhone: boolean;
  hasFallbackResponder: boolean | null;
}[];

export function ReportingLinkCoverage({
  coverage,
  properties,
}: {
  coverage: ReportingCoverage | null;
  properties: { id: string; property_name: string }[];
}) {
  const byProperty = new Map(coverage?.map((row) => [row.propertyId, row]));
  const gaps = properties.flatMap((property) => {
    const row = byProperty.get(property.id);
    if (!row)
      return [{ ...property, issue: 'Coverage could not be confirmed' }];
    const missing = [
      !row.hasEmergencyPhone && 'out-of-hours phone number',
      row.hasFallbackResponder === false && 'backup responder',
    ].filter(Boolean);
    const issue = [
      missing.length > 0 && `Missing ${missing.join(' and ')}`,
      row.hasFallbackResponder === null &&
        'Backup coverage could not be confirmed',
    ]
      .filter(Boolean)
      .join(' · ');
    return issue ? [{ ...property, issue }] : [];
  });
  if (!gaps.length) return null;

  return (
    <aside className='mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950'>
      <h2 className='font-semibold'>Check emergency coverage before sharing</h2>
      <ul className='mt-2 list-disc space-y-1 pl-5'>
        {gaps.map(({ id, property_name, issue }) => (
          <li key={id}>
            <span className='font-medium'>{property_name}</span> · {issue}
          </li>
        ))}
      </ul>
      <Link
        className='mt-2 inline-block font-semibold underline underline-offset-2'
        href='/maintenance/emergencies#emergency-coverage'
      >
        Review emergency coverage
      </Link>
    </aside>
  );
}
