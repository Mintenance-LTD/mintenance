/**
 * DBS provider integrations.
 *
 * Extracted from DBSCheckService.ts (2026-08-02) — the service was over
 * the 500-line cap, and these are self-contained outbound HTTP calls with
 * no service state, so they belong on their own.
 *
 * NOTE: every one of these submits a REAL criminal-record check to a live
 * provider. The caller (DBSCheckService.initiateCheck) is responsible for
 * refusing to reach here without a date of birth — without it a provider
 * can match the wrong person's record. Do not call these directly.
 */
import type { DBSCheckLevel } from './DBSCheckService';

/**
 * DBS Online integration (UK provider)
 * https://www.dbscheckonline.org.uk/
 * Requires DBS_ONLINE_API_KEY environment variable
 */
export async function initiateDBSOnlineCheck(
  contractor: unknown,
  dbsType: DBSCheckLevel
): Promise<string> {
  const apiKey = process.env.DBS_ONLINE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'DBS Online API key not configured. Set DBS_ONLINE_API_KEY environment variable.'
    );
  }

  const c = contractor as Record<string, unknown>;
  const response = await fetch('https://api.dbscheckonline.org.uk/v1/checks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      date_of_birth: c.date_of_birth,
      // Field names match the live `profiles` schema. `address` is a
      // single line (there is no line2 equivalent) and the postcode
      // column is `postcode`, not `postal_code`.
      address: {
        line1: c.address,
        city: c.city,
        postcode: c.postcode,
      },
      check_type: dbsType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DBS Online API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.check_id;
}

/**
 * GB Group integration (UK provider)
 * https://www.gbgplc.com/en/solutions/identity/criminal-record-checks/
 * Requires GBGROUP_API_KEY environment variable
 */
export async function initiateGBGroupCheck(
  contractor: unknown,
  dbsType: DBSCheckLevel
): Promise<string> {
  const apiKey = process.env.GBGROUP_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GB Group API key not configured. Set GBGROUP_API_KEY environment variable.'
    );
  }

  const c = contractor as Record<string, unknown>;
  const response = await fetch('https://api.gbgplc.com/v1/criminal-checks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      date_of_birth: c.date_of_birth,
      check_type: dbsType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GB Group API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.check_id;
}

/**
 * uCheck integration (UK provider)
 * https://ucheck.co.uk/
 * Requires UCHECK_API_KEY environment variable
 */
export async function initiateUCheckCheck(
  contractor: unknown,
  dbsType: DBSCheckLevel
): Promise<string> {
  const apiKey = process.env.UCHECK_API_KEY;

  if (!apiKey) {
    throw new Error(
      'uCheck API key not configured. Set UCHECK_API_KEY environment variable.'
    );
  }

  const c = contractor as Record<string, unknown>;
  const response = await fetch('https://api.ucheck.co.uk/v1/checks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      date_of_birth: c.date_of_birth,
      check_type: dbsType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`uCheck API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.check_id;
}

/**
 * Custom/placeholder implementation
 */
export async function initiateCustomCheck(
  contractor: unknown,
  dbsType: DBSCheckLevel
): Promise<string> {
  return `custom_${dbsType}_${Date.now()}`;
}
