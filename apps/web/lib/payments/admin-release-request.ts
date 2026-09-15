interface PendingRelease {
  key: string;
  reason: string;
}
const slot = (adminId: string, escrowId: string) =>
  `mintenance:admin-release:${adminId}:${escrowId}`;
export function readPendingAdminRelease(
  adminId: string,
  escrowId: string
): PendingRelease | null {
  const raw = localStorage.getItem(slot(adminId, escrowId));
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingRelease;
  if (!value.key || typeof value.reason !== 'string')
    throw new Error('Saved release could not be recovered. Contact support.');
  return value;
}
export async function submitAdminRelease(
  adminId: string,
  escrowId: string,
  reason: string,
  csrfHeaders: HeadersInit
) {
  if (!adminId || !escrowId) throw new Error('Payment identity is missing');
  const existing = readPendingAdminRelease(adminId, escrowId);
  if (existing && existing.reason !== reason)
    throw new Error('Reopen the form to recover the original release reason.');
  const pending = existing ?? { key: crypto.randomUUID(), reason };
  localStorage.setItem(slot(adminId, escrowId), JSON.stringify(pending));
  const headers = new Headers(csrfHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Idempotency-Key', pending.key);
  const response = await fetch(
    `/api/admin/refunds/${encodeURIComponent(escrowId)}`,
    {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ action: 'release', reason: pending.reason }),
    }
  );
  const result = await response.json();
  if (
    !response.ok ||
    result.success !== true ||
    result.status !== 'completed' ||
    !result.operationId ||
    !['amount', 'contractorPayout', 'platformFee'].every(
      (key) =>
        typeof result[key] === 'number' &&
        Number.isFinite(result[key]) &&
        result[key] >= 0
    ) ||
    Math.abs(result.amount - result.contractorPayout - result.platformFee) >
      0.001
  ) {
    throw new Error(
      typeof result.message === 'string'
        ? result.message
        : 'Release is not confirmed. Retry the same action to check its status.'
    );
  }
  if (readPendingAdminRelease(adminId, escrowId)?.key === pending.key)
    localStorage.removeItem(slot(adminId, escrowId));
  return result;
}
