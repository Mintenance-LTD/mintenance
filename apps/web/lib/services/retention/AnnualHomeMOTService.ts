/**
 * AnnualHomeMOTService — R5 #6 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Runs daily from /api/cron/annual-home-mot. For every property whose
 * anniversary of `created_at` is today (UTC date), emails the owner
 * the year's MOT list, personalised to property age.
 *
 * Dual delivery:
 *   - Email via EmailService.sendAnnualHomeMOTEmail
 *   - In-app via NotificationService (type 'annual_home_mot')
 *
 * Both channels respect user_notification_preferences via the R2
 * NotificationService integration.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { env } from '@/lib/env';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

interface Result {
  evaluated: number;
  sent: number;
  skipped: number;
  email_failed: number;
}

/**
 * Age-weighted recommendation list. Every UK home gets the basics; older
 * homes get wiring + damp checks surfaced. New-build homes see snag-list
 * reminders.
 */
function recommendedChecks(ageYears: number | null): string[] {
  const universal = [
    'Test smoke and carbon-monoxide alarms',
    'Book an annual boiler service (Gas Safe)',
    'Clear gutters and check roof for missing tiles',
    'Check external sealant around windows and doors',
  ];

  if (ageYears === null) return universal;

  if (ageYears < 5) {
    return [
      'Walk through the snag list — last items on the builder warranty',
      ...universal,
    ];
  }
  if (ageYears < 30) {
    return [
      ...universal,
      'Check silicone around bath and shower for mould / gaps',
    ];
  }
  if (ageYears < 60) {
    return [
      ...universal,
      'Inspect wiring age — consider an electrician check if over 20 yrs',
      'Check for rising damp / condensation on external walls',
    ];
  }
  return [
    ...universal,
    'Get a full electrical condition report (EICR) if not done in 5 years',
    'Check for rising damp and timber movement',
    'Inspect any lead flashing on the roof',
  ];
}

interface AnniversaryProperty {
  id: string;
  owner_id: string;
  property_name: string;
  year_built: number | null;
  created_at: string;
}

/** Keyset pagination continues even if the server caps pages below our limit. */
export async function loadAnniversaryProperties(now: Date, month: string, day: string): Promise<AnniversaryProperty[]> {
  const matches: AnniversaryProperty[] = [];
  let after: string | undefined;
  for (;;) {
    let query = serverSupabase.from('properties')
      .select('id, owner_id, property_name, year_built, created_at')
      .lt('created_at', now.getUTCFullYear() + '-01-01T00:00:00Z')
      .order('id', { ascending: true }).limit(500);
    if (after) query = query.gt('id', after);
    const { data, error } = await query;
    if (error) throw new Error('Annual Home MOT property scan failed: ' + error.message);
    const rows = (data ?? []) as AnniversaryProperty[];
    if (!rows.length) return matches;
    const last = rows[rows.length - 1].id;
    if (after && last <= after) throw new Error('Annual Home MOT pagination did not advance');
    after = last;
    for (const row of rows) {
      const date = new Date(row.created_at);
      if (String(date.getUTCMonth() + 1).padStart(2, '0') === month && String(date.getUTCDate()).padStart(2, '0') === day) matches.push(row);
    }
  }
}

export class AnnualHomeMOTService {
  /**
   * For each property whose `created_at` anniversary is today, send
   * an MOT email + in-app nudge to the owner.
   */
  static async sendTodaysAnniversaries(): Promise<Result> {
    const result: Result = {
      evaluated: 0,
      sent: 0,
      skipped: 0,
      email_failed: 0,
    };
    const now = new Date();
    const mm = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = now.getUTCDate().toString().padStart(2, '0');

    const rows = await loadAnniversaryProperties(now, mm, dd);

    if (!rows || rows.length === 0) return result;
    result.evaluated = rows.length;

    // Load owner profiles once.
    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id)));
    const byOwner = new Map<string, { id: string; first_name: string | null; email: string | null }>();
    for (let start = 0; start < ownerIds.length; start += 200) {
      const { data: profiles, error } = await serverSupabase.from('profiles')
        .select('id, first_name, email').in('id', ownerIds.slice(start, start + 200)).eq('role', 'homeowner');
      if (error) throw new Error('Annual Home MOT owner lookup failed: ' + error.message);
      for (const profile of profiles ?? []) byOwner.set(profile.id, profile);
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';
    const viewUrl = `${baseUrl}/jobs/create`;

    for (const row of rows) {
      const owner = byOwner.get(row.owner_id);
      if (!owner?.email) {
        result.skipped += 1;
        continue;
      }
      const ageYears = row.year_built
        ? Math.max(0, now.getUTCFullYear() - row.year_built)
        : null;
      const checks = recommendedChecks(ageYears);

      await NotificationService.createNotification({
        userId: row.owner_id,
        type: 'annual_home_mot',
        title: `Your Annual Home MOT`,
        message: `${row.property_name}: ${checks.length} quick checks to keep small problems small.`,
        actionUrl: '/jobs/create',
        metadata: {
          property_id: row.id,
          year_built: row.year_built,
          age_years: ageYears,
        },
      });

      const ok = await EmailService.sendAnnualHomeMOTEmail(
        owner.email as string,
        {
          homeownerName: (owner.first_name as string) || 'there',
          propertyName: row.property_name,
          propertyAge: ageYears,
          recommendedChecks: checks,
          viewUrl,
        }
      );
      if (ok) result.sent += 1;
      else result.email_failed += 1;
    }

    return result;
  }
}
