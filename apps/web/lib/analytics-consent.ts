export const COOKIE_CONSENT_KEY = 'mintenance_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'mintenance:cookie-consent';
export const COOKIE_PREFERENCES_EVENT = 'mintenance:cookie-preferences';
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(COOKIE_CONSENT_KEY) || 'null'
    );
    return stored?.version === '2.0' && stored.preferences?.analytics === true;
  } catch {
    return false;
  }
}
export function observeAnalyticsConsent(apply: (allowed: boolean) => void) {
  const update = () => apply(hasAnalyticsConsent());
  const storage = (event: StorageEvent) => {
    if (event.key === COOKIE_CONSENT_KEY || event.key === null) update();
  };
  update();
  window.addEventListener(COOKIE_CONSENT_EVENT, update);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, update);
    window.removeEventListener('storage', storage);
  };
}
