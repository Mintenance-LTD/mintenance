const recoveryLifetimeMs = 60 * 60 * 1000;
const storageKey = (token: string) => `mintenance:report-recovery:${token}`;

export interface ReportAttempt {
  key: string;
  expiresAt: number;
}

export function createReportAttempt(): ReportAttempt {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return {
    key: Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    ),
    expiresAt: Date.now() + recoveryLifetimeMs,
  };
}

export function readReportAttempt(token: string): ReportAttempt | null {
  try {
    const attempt = JSON.parse(
      sessionStorage.getItem(storageKey(token)) ?? 'null'
    );
    if (!attempt) return null;
    if (
      typeof attempt.key === 'string' &&
      /^[0-9a-f]{64}$/.test(attempt.key) &&
      Number.isFinite(attempt.expiresAt) &&
      attempt.expiresAt > Date.now()
    ) {
      return attempt;
    }
    sessionStorage.removeItem(storageKey(token));
  } catch {
    // Private browsing may disable storage. The in-memory attempt still works.
  }
  return null;
}

export function storeReportAttempt(
  token: string,
  attempt: ReportAttempt | null
): boolean {
  try {
    if (attempt)
      sessionStorage.setItem(storageKey(token), JSON.stringify(attempt));
    else sessionStorage.removeItem(storageKey(token));
    return true;
  } catch {
    return false;
  }
}
