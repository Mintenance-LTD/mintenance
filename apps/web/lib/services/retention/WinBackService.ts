import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/** Users inactive for this many days are considered dormant */
const DORMANCY_DAYS = 30;

/** Minimum gap between win-back emails for the same user */
const WIN_BACK_COOLDOWN_DAYS = 30;

/** Max users to re-engage per cron run (split across roles) */
const BATCH_LIMIT = 100;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

type UserRole = 'homeowner' | 'contractor';

interface DormantUser {
  id: string;
  email: string;
  first_name: string;
  role: UserRole;
}

function buildHomeownerHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0F172A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .highlight { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 0 6px 6px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>We Miss You, ${firstName}!</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>It's been a while since we last saw you on Mintenance. Your home deserves the best care — and we're here to help.</p>
      <div class="highlight">
        <strong>What's waiting for you:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>Verified, rated contractors ready to quote</li>
          <li>Secure escrow payments — you only pay when satisfied</li>
          <li>Photo proof of completed work before release</li>
        </ul>
      </div>
      <p>Post a job in under 2 minutes and get your first bids within hours.</p>
      <a href="${BASE_URL}/jobs/create" class="button">Post a Job Now</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
      <p>Questions? <a href="mailto:support@mintenance.com" style="color: #6b7280;">support@mintenance.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

function buildContractorHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0F172A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .highlight { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 6px 6px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Jobs Are Waiting for You</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>We noticed you haven't been on Mintenance recently. Homeowners in your area are actively posting jobs that match your skills — don't let them go to your competitors.</p>
      <div class="highlight">
        <strong>Why come back now?</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>New jobs posted daily across all categories</li>
          <li>Secure escrow — guaranteed payment for completed work</li>
          <li>Build your reputation with verified reviews</li>
        </ul>
      </div>
      <p>Browse open jobs and submit your first bid today.</p>
      <a href="${BASE_URL}/contractor/jobs" class="button">Browse Open Jobs</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
      <p>Questions? <a href="mailto:support@mintenance.com" style="color: #6b7280;">support@mintenance.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export class WinBackService {
  /**
   * Find users (homeowners and contractors) who have been inactive for 30+ days
   * and have not received a win-back email in the last 30 days.
   *
   * Dormancy proxy:
   *   - Contractors: no bid placed in 30 days
   *   - Homeowners:  no job posted in 30 days
   */
  static async getDormantUsers(): Promise<DormantUser[]> {
    const dormancyCutoff = new Date(
      Date.now() - DORMANCY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const cooldownCutoff = new Date(
      Date.now() - WIN_BACK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // Step 1: Get all active, onboarded users
    const { data: profiles, error: profileError } = await serverSupabase
      .from('profiles')
      .select('id, email, first_name, role')
      .in('role', ['homeowner', 'contractor'])
      .is('deleted_at', null)
      .eq('onboarding_completed', true)
      .not('email', 'is', null)
      .limit(BATCH_LIMIT * 6);

    if (profileError || !profiles || profiles.length === 0) {
      logger.error('Failed to fetch profiles for win-back', profileError, {
        service: 'win-back',
      });
      return [];
    }

    const contractorIds = profiles.filter((p) => p.role === 'contractor').map((p) => p.id);
    const homeownerIds = profiles.filter((p) => p.role === 'homeowner').map((p) => p.id);

    // Step 2a: Contractors active in last 30 days (placed a bid)
    const { data: activeBids } = await serverSupabase
      .from('bids')
      .select('contractor_id')
      .in('contractor_id', contractorIds)
      .gte('created_at', dormancyCutoff);

    const activeContractorIds = new Set((activeBids || []).map((b) => b.contractor_id));

    // Step 2b: Homeowners active in last 30 days (posted a job)
    const { data: activeJobs } = await serverSupabase
      .from('jobs')
      .select('homeowner_id')
      .in('homeowner_id', homeownerIds)
      .gte('created_at', dormancyCutoff);

    const activeHomeownerIds = new Set((activeJobs || []).map((j) => j.homeowner_id));

    // Step 3: Build dormant list
    const dormant = profiles.filter((p) => {
      if (p.role === 'contractor') return !activeContractorIds.has(p.id);
      if (p.role === 'homeowner') return !activeHomeownerIds.has(p.id);
      return false;
    });

    if (dormant.length === 0) {
      return [];
    }

    const dormantIds = dormant.map((u) => u.id);

    // Step 4: Dedup — skip users already re-engaged within the cooldown window
    const { data: recentWinBacks } = await serverSupabase
      .from('notifications')
      .select('user_id')
      .in('user_id', dormantIds)
      .eq('type', 'win_back')
      .gte('created_at', cooldownCutoff);

    const recentlyContactedIds = new Set((recentWinBacks || []).map((n) => n.user_id));

    return dormant
      .filter((u) => !recentlyContactedIds.has(u.id))
      .slice(0, BATCH_LIMIT) as DormantUser[];
  }

  /**
   * Send win-back email + in-app notification to all qualifying dormant users.
   */
  static async sendWinBackCampaign(): Promise<{ sent: number; failed: number }> {
    const dormantUsers = await this.getDormantUsers();

    if (dormantUsers.length === 0) {
      logger.info('No dormant users to re-engage', { service: 'win-back' });
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const user of dormantUsers) {
      try {
        const firstName = user.first_name || 'there';
        const isContractor = user.role === 'contractor';

        const html = isContractor
          ? buildContractorHtml(firstName)
          : buildHomeownerHtml(firstName);

        const subject = isContractor
          ? 'Jobs are waiting — come back to Mintenance'
          : 'We miss you — your home deserves the best care';

        const actionUrl = isContractor ? '/contractor/jobs' : '/jobs/create';

        // Email channel (returns false on failure, does not throw)
        await EmailService.sendEmail({ to: user.email, subject, html });

        // In-app channel — the notification row is also our dedup record.
        // If this returns null the dedup write failed; count as failed to prevent duplicate emails.
        const notifId = await NotificationService.createNotification({
          userId: user.id,
          title: isContractor ? 'Jobs are waiting for your bids' : 'We miss you on Mintenance!',
          message: isContractor
            ? 'New jobs in your area are ready for quotes. Come back and start bidding.'
            : 'Post a job today and get quotes from verified contractors within hours.',
          type: 'win_back',
          actionUrl,
        });

        if (notifId === null) {
          logger.error('Win-back dedup write failed — marking as failed to prevent duplicate email', {
            service: 'win-back',
            userId: user.id,
          });
          failed++;
          continue;
        }

        sent++;
      } catch (error) {
        logger.error('Failed to send win-back to user', error, {
          service: 'win-back',
          userId: user.id,
          role: user.role,
        });
        failed++;
      }
    }

    return { sent, failed };
  }
}
