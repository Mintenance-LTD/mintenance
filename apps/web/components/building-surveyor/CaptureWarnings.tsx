import type { CaptureWarning } from '@/lib/services/building-surveyor/recapture-guidance';

export function CaptureWarnings({ warnings }: { warnings?: CaptureWarning[] }) {
  if (!warnings?.length) return null;
  return (
    <aside
      role='note'
      className='rounded border border-amber-300 bg-amber-50 p-4 text-sm'
    >
      <h3 className='font-semibold'>Check photo detail</h3>
      <ul className='mt-2 list-disc pl-5'>
        {warnings.map((warning) => (
          <li key={`${warning.photoIndex}-${warning.reason}`}>
            Photo {warning.photoIndex + 1}:{' '}
            {warning.reason === 'soft_focus'
              ? 'Edges may be out of focus. Add a sharper close-up if the suspected fault is not clear.'
              : 'Little surface detail is visible. This can be a smooth surface; add a close-up if needed to show the suspected fault.'}
          </li>
        ))}
      </ul>
      <p className='mt-2'>
        Fine defects may be missed. These checks do not establish that the
        property is safe.
      </p>
    </aside>
  );
}
