/** Keep structured job metadata when editing the user-visible requirements. */
export function readJobRequirements(value: unknown): {
  metadata: Record<string, unknown>;
  items: string[];
} {
  const metadata =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const items = Array.isArray(value) ? value : metadata.items;
  return {
    metadata,
    items: Array.isArray(items)
      ? items.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

export function writeJobRequirements(
  metadata: Record<string, unknown>,
  items: string[]
) {
  return { ...metadata, items };
}
