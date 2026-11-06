/** Collapse repeated comma-separated address components for display only. */
export function displayAddress(value: string): string {
  const seen = new Set<string>();
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLocaleLowerCase('en-GB').replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}
