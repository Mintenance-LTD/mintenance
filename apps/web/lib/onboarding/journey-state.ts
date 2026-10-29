export type JourneyStatus = 'in_progress' | 'completed' | 'skipped';
export interface JourneyProgress {
  status: JourneyStatus;
  step: number;
  pending?: boolean;
}
export const journeyStorageKey = (userId: string, journey: string) =>
  `mintenance:onboarding:v2:web:${userId}:${journey}`;
export function readJourney(
  userId: string,
  journey: string
): JourneyProgress | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(journeyStorageKey(userId, journey)) ?? 'null'
    );
    return value &&
      ['in_progress', 'completed', 'skipped'].includes(value.status) &&
      Number.isInteger(value.step) &&
      value.step >= 0 &&
      value.step <= 100
      ? value
      : null;
  } catch {
    return null;
  }
}
export function writeJourney(
  userId: string,
  journey: string,
  value: JourneyProgress
) {
  try {
    localStorage.setItem(
      journeyStorageKey(userId, journey),
      JSON.stringify(value)
    );
  } catch {
    /* Server remains the source of truth. */
  }
}
