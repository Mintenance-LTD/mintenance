export const INCOMPLETE_QUIET_HOURS =
  'Enter both quiet hours times or leave both blank.';

export function hasIncompleteQuietHours(
  start: string | null,
  end: string | null
) {
  return Boolean(start) !== Boolean(end);
}

// Older settings saved escrow_released, while manual releases emit payment_released.
export const MANUAL_RELEASE_TYPE = 'payment_released';
export const LEGACY_MANUAL_RELEASE_TYPE = 'escrow_released';
