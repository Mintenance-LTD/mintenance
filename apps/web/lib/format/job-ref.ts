/**
 * Formats a short, human-readable job reference for display.
 *
 * This is a deterministic display projection of the real `jobs.id` UUID — it is
 * NOT a stored sequence or fabricated number. The reference is derived by taking
 * the first 8 hexadecimal characters of the UUID (dashes stripped), uppercased,
 * and prefixed with `JOB-`. Because it is a pure function of the real UUID it is
 * stable across renders and unique enough for display in admin tables.
 *
 * @example
 *   formatJobRef('9412abcd-1234-5678-9abc-def012345678') // => 'JOB-9412ABCD'
 *
 * @param id - The real `jobs.id` UUID.
 * @returns A reference of the form `JOB-XXXXXXXX`, or `JOB-UNKNOWN` if no id.
 */
export function formatJobRef(id: string): string {
  if (!id) return 'JOB-UNKNOWN';
  const hex = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `JOB-${hex}`;
}
