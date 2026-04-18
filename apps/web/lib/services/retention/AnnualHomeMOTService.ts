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
import { logger } from '@mintenance/shared';
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

    // Anniversary match: month+day of created_at equals today's month+day.
    // Postgres `to_char(created_at, 'MM-DD')` is cheap against a small
    // properties table; if the table grows past ~100k rows we'll add a
    // generated column + index.
    const { data, error } = await serverSupabase.rpc(
      'select_properties_with_anniversary_today',
      { today_md: `${mm}-${dd}` }
    );

    // Fallback: if the RPC isn't defined, issue the query directly.
    let rows: Array<{
      id: string;
      owner_id: string;
      property_name: string;
      year_built: number | null;
    }> | null = data as typeof rows | null;

    if (error || !rows) {
      logger.info('annual-home-mot: RPC missing, using fallback query', {
        service: 'AnnualHomeMOTService',
      });
      const fallback = await serverSupabase
        .from('properties')
        .select('id, owner_id, property_name, year_built, created_at')
        .limit(5000);
      if (fallback.error) {
        logger.warn('annual-home-mot: fallback query failed', {
          err: fallback.error.message,
        });
        return result;
      }
      rows = (fallback.data ?? [])
        .filter((r) => {
          if (!r.created_at) return false;
          const d = new Date(r.created_at as string);
          const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
          const day = d.getUTCDate().toString().padStart(2, '0');
          return m === mm && day === dd;
        })
        .map((r) => ({
          id: r.id as string,
          owner_id: r.owner_id as string,
          property_name: r.property_name as string,
          year_built: r.year_built as number | null,
        }));
    }

    if (!rows || rows.length === 0) return result;
    result.evaluated = rows.length;

    // Load owner profiles once.
    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id)));
    const { data: profiles } = await serverSupabase
      .from('profiles')
      .select('id, first_name, email')
      .in('id', ownerIds)
      .eq('role', 'homeowner');
    const byOwner = new Map((profiles ?? []).map((p) => [p.id as string, p]));

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
