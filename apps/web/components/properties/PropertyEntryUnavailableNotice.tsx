export function PropertyEntryUnavailableNotice({
  unavailable,
}: {
  unavailable: boolean;
}) {
  if (!unavailable) return null;
  return (
    <p
      role='status'
      className='rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950'
    >
      The saved entry code is temporarily unavailable. Refresh this page to try
      again. Other property and job details are still available.
    </p>
  );
}
