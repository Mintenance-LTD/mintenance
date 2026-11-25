export function workWindowEndIsInvalid(
  start: string | null | undefined,
  end: string | null | undefined
): boolean {
  return !!end && (!start || !(Date.parse(end) > Date.parse(start)));
}

/** Move both ends of an agreed window together, using its recorded duration. */
export function movedWorkWindowEnd(
  newStart: Date,
  oldStart: string | null,
  oldEnd: string | null
): string | null {
  if (!oldStart || !oldEnd || workWindowEndIsInvalid(oldStart, oldEnd))
    return null;
  return new Date(
    newStart.getTime() + Date.parse(oldEnd) - Date.parse(oldStart)
  ).toISOString();
}
