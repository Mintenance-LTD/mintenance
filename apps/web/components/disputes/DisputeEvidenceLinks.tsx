export function DisputeEvidenceLinks({ items }: { items?: unknown[] }) {
  const evidence = (items ?? []).filter(
    (item): item is { label: string; url: string | null } =>
      typeof item === 'object' &&
      item !== null &&
      'label' in item &&
      typeof item.label === 'string' &&
      'url' in item &&
      (item.url === null ||
        (typeof item.url === 'string' && /^https?:\/\//.test(item.url)))
  );
  if (!evidence.length) return null;
  return (
    <section aria-label='Dispute evidence'>
      <h3>Supporting evidence</h3>
      <ul>
        {evidence.map((item, index) => (
          <li key={index}>
            {item.url ? (
              <a
                href={item.url}
                target='_blank'
                rel='noopener noreferrer'
                className='underline'
              >
                {item.label} (opens in a new tab)
              </a>
            ) : (
              <span>
                {item.label} is unavailable. Refresh this page to retry.
              </span>
            )}
          </li>
        ))}
      </ul>
      <p>Links expire after 10 minutes. Refresh this page for a new link.</p>
    </section>
  );
}
