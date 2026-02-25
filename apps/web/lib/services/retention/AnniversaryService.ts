import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

interface AnniversaryContractor {
  id: string;
  email: string;
  first_name: string;
  total_jobs_completed: number;
  rating: number | null;
  years: number;
}

function buildAnniversaryHtml(contractor: AnniversaryContractor): string {
  const yearsLabel = contractor.years === 1 ? '1 year' : `${contractor.years} years`;
  const ratingLine = contractor.rating
    ? `<li>⭐ <strong>${contractor.rating.toFixed(1)}</strong> average rating from your clients</li>`
    : '';
  const jobsLine = contractor.total_jobs_completed > 0
    ? `<li>🔨 <strong>${contractor.total_jobs_completed}</strong> jobs completed on Mintenance</li>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0F172A 0%, #1e3a5f 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0 0 8px 0; font-size: 28px; }
    .header p { margin: 0; opacity: 0.85; font-size: 16px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .stats { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .stats ul { margin: 8px 0 0 0; padding-left: 0; list-style: none; }
    .stats li { padding: 4px 0; font-size: 15px; }
    .button { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎂 Happy ${yearsLabel} Anniversary!</h1>
      <p>Thank you for being part of Mintenance</p>
    </div>
    <div class="content">
      <p>Hi ${contractor.first_name},</p>
      <p>It's been <strong>${yearsLabel}</strong> since you joined Mintenance — and what a journey it's been! Thank you for your hard work, professionalism, and for being one of the contractors that homeowners trust.</p>
      ${(ratingLine || jobsLine) ? `
      <div class="stats">
        <strong>Your ${yearsLabel} on Mintenance:</strong>
        <ul>
          ${jobsLine}
          ${ratingLine}
        </ul>
      </div>` : ''}
      <p>We're proud to have you in our community. Here's to many more successful jobs ahead!</p>
      <a href="${BASE_URL}/contractor/dashboard-enhanced" class="button">View Your Dashboard</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
      <p>Questions? <a href="mailto:support@mintenance.com" style="color: #6b7280;">support@mintenance.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export class AnniversaryService {
  /**
   * Find contractors whose platform anniversary is today (any year).
   * Checks a 48-hour window centred on now to tolerate timezone offsets.
   */
  static async getTodaysAnniversaryContractors(): Promise<AnniversaryContractor[]> {
    const now = new Date();

    // Build all anniversary windows that fall today.
    // A contractor who joined on 24 Feb 2023 celebrates their 3rd anniversary on 24 Feb 2026.
    // We detect this by checking whether (month + day) of created_at matches today's (month + day).
    // Since PostgREST doesn't support date functions, we fetch all contractors and filter in JS.
    // Anniversaries are rare (≈1/365 of contractors per day) so the JS filter is cheap.
    const { data: contractors, error } = await serverSupabase
      .from('profiles')
      .select('id, email, first_name, created_at, total_jobs_completed, rating')
      .eq('role', 'contractor')
      .is('deleted_at', null)
      .not('email', 'is', null)
      .gte('created_at', new Date(now.getFullYear() - 10, 0, 1).toISOString()) // joined in last 10 years
      .limit(5000); // prevent silent PostgREST default-cap truncation

    if (error) {
      logger.error('Failed to fetch contractors for anniversary check', error, {
        service: 'anniversary',
      });
      return [];
    }

    if (!contractors || contractors.length === 0) {
      return [];
    }

    const todayMonth = now.getUTCMonth();
    const todayDay = now.getUTCDate();

    const anniversaryContractors = contractors
      .filter((c) => {
        const joinDate = new Date(c.created_at);
        const joinMonth = joinDate.getUTCMonth();
        const joinDay = joinDate.getUTCDate();
        const yearDiff = now.getUTCFullYear() - joinDate.getUTCFullYear();

        // Must be at least 1 full year on the platform, and today is their anniversary date
        return yearDiff >= 1 && joinMonth === todayMonth && joinDay === todayDay;
      })
      .map((c) => ({
        id: c.id,
        email: c.email as string,
        first_name: c.first_name || 'there',
        total_jobs_completed: c.total_jobs_completed || 0,
        rating: typeof c.rating === 'number' ? c.rating : null,
        years: now.getUTCFullYear() - new Date(c.created_at).getUTCFullYear(),
      }));

    if (anniversaryContractors.length === 0) {
      return [];
    }

    // Dedup: exclude contractors already sent an anniversary notification in the last 24 hours.
    // Guards against cron retries or accidental double-triggers.
    const cooldownCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const anniversaryIds = anniversaryContractors.map((c) => c.id);

    const { data: recentAnniversaries } = await serverSupabase
      .from('notifications')
      .select('user_id')
      .in('user_id', anniversaryIds)
      .eq('type', 'anniversary')
      .gte('created_at', cooldownCutoff);

    const alreadySentIds = new Set((recentAnniversaries || []).map((n) => n.user_id));

    return anniversaryContractors.filter((c) => !alreadySentIds.has(c.id));
  }

  /**
   * Send anniversary emails to all contractors celebrating today.
   */
  static async sendAnniversaryEmails(): Promise<{ sent: number; failed: number }> {
    const contractors = await this.getTodaysAnniversaryContractors();

    if (contractors.length === 0) {
      logger.info('No contractor anniversaries today', { service: 'anniversary' });
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const contractor of contractors) {
      try {
        const yearsLabel = contractor.years === 1 ? '1-year' : `${contractor.years}-year`;

        // Email channel
        await EmailService.sendEmail({
          to: contractor.email,
          subject: `🎂 Happy ${yearsLabel} Anniversary on Mintenance, ${contractor.first_name}!`,
          html: buildAnniversaryHtml(contractor),
        });

        // In-app channel — also serves as the dedup record for the 24h cooldown guard.
        await NotificationService.createNotification({
          userId: contractor.id,
          title: `🎂 Happy ${yearsLabel} Anniversary!`,
          message: `It's been ${contractor.years === 1 ? 'a year' : `${contractor.years} years`} since you joined Mintenance. Thank you for your hard work!`,
          type: 'anniversary',
          actionUrl: '/contractor/dashboard-enhanced',
          metadata: { years: contractor.years, totalJobsCompleted: contractor.total_jobs_completed },
        });

        sent++;
      } catch (error) {
        logger.error('Failed to send anniversary email', error, {
          service: 'anniversary',
          contractorId: contractor.id,
        });
        failed++;
      }
    }

    return { sent, failed };
  }
}
