import type { VisualEvidence } from '@/lib/services/building-surveyor/stages/observe-photos';

export function VisibleEvidenceCard({
  evidence,
}: {
  evidence: VisualEvidence;
}) {
  return (
    <section className='rounded-xl border border-emerald-200 bg-white p-6 space-y-4'>
      <h3 className='text-xl font-semibold'>
        Visible findings from your photos
      </h3>
      <p className='text-sm text-gray-600'>
        AI observations of the photographed surface. These need human review and
        do not establish that the building is safe.
      </p>
      {evidence.photos.map((photo) => (
        <div key={photo.photoIndex} className='border-t pt-4 space-y-2'>
          <h4 className='font-semibold'>Photo {photo.photoIndex + 1}</h4>
          {photo.observation.outcome === 'no_visible_defect' ? (
            <p>
              No defect identified in this visible region. Hidden defects and
              other areas have not been assessed.
            </p>
          ) : (
            <ul className='list-disc pl-5'>
              {photo.observation.observations.map((item, index) => (
                <li key={index}>{item.description}</li>
              ))}
            </ul>
          )}
          {photo.observation.limitations.length > 0 && (
            <>
              <p className='font-medium'>Limits of this photo</p>
              <ul className='list-disc pl-5 text-gray-600'>
                {photo.observation.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
      <aside className='rounded bg-amber-50 p-4'>
        <h4 className='font-semibold'>What remains unknown</h4>
        <p>
          The cause, structural significance, repair scope and price have not
          been established. A photo alone cannot confirm settlement, compliance
          or insurance risk.
        </p>
        <p className='mt-2'>
          For further assessment, add a wider view, a sharp close-up with a
          scale where safe, and when the issue appeared or changed. A suitable
          professional may need to inspect it on site.
        </p>
      </aside>
    </section>
  );
}
