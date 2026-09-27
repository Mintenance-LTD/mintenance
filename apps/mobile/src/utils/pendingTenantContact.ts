import * as SecureStore from 'expo-secure-store';

export type PendingTenantContact = {
  operationId: string;
  name: string;
  email: string;
  phone: string;
};

function storageKey(actor: string, property: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(actor) || !/^[a-zA-Z0-9-]+$/.test(property))
    throw new Error('Contact recovery is unavailable for this account');
  return `pending-tenant.${actor}.${property}`;
}

export async function readPendingTenant(
  actor: string,
  property: string
): Promise<PendingTenantContact | null> {
  const raw = await SecureStore.getItemAsync(storageKey(actor, property));
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingTenantContact;
  if (
    !value ||
    !/^[a-f0-9-]{36}$/.test(value.operationId) ||
    typeof value.name !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.phone !== 'string'
  )
    throw new Error('Saved contact details could not be recovered');
  return value;
}

export async function savePendingTenant(
  actor: string,
  property: string,
  details: Omit<PendingTenantContact, 'operationId'>
) {
  const previous = await readPendingTenant(actor, property);
  // A stable operation survives both a lost response and process termination.
  const operationId =
    previous?.operationId ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const value = Math.floor(Math.random() * 16);
      return (c === 'x' ? value : (value & 3) | 8).toString(16);
    });
  const pending = { ...details, operationId };
  await SecureStore.setItemAsync(
    storageKey(actor, property),
    JSON.stringify(pending)
  );
  return pending;
}

export async function clearPendingTenant(actor: string, property: string) {
  await SecureStore.deleteItemAsync(storageKey(actor, property));
}
