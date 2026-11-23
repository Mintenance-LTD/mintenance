import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { escapeHtml } from '@/lib/email-templates';
import { winBackRecipient } from './win-back-eligibility';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/** Users inactive for this many days are considered dormant */
const DORMANCY_DAYS = 30;

/** Minimum gap between win-back emails for the same user */
const WIN_BACK_COOLDOWN_DAYS = 30;

/** Max users to re-engage per cron run (split across roles) */
const BATCH_LIMIT = 100;

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.mintenance.co.uk';

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
      <p>If you have maintenance to arrange, you can return to Mintenance at any time. Your home deserves the best care — and we're here to help.</p>
      <div class="highlight">
        <strong>What's waiting for you:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>Compare contractor profiles and reviews</li>
          <li>Sign the agreement, fund Protected Payment, then review completed work before release checks</li>
          <li>Photo proof of completed work before release</li>
        </ul>
      </div>
      <p>Post a job when you are ready. Bids depend on local contractor availability.</p>
      <a href="${BASE_URL}/jobs/create" class="button">Post a Job Now</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
      <p><a href="${BASE_URL}/settings/notifications">Manage email preferences</a></p>
      <p>Questions? <a href="mailto:support@mintenance.co.uk" style="color: #6b7280;">support@mintenance.co.uk</a></p>
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
      <h1>Return to Mintenance</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Browse current opportunities when you are available for work. Listings depend on your location and trade.</p>
      <div class="highlight">
        <strong>Why come back now?</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>Browse current job listings</li>
          <li>Protected Payment, subject to the agreement and release checks</li>
          <li>Build your reputation with verified reviews</li>
        </ul>
      </div>
      <p>Browse open jobs and submit your first bid today.</p>
      <a href="${BASE_URL}/contractor/jobs" class="button">Browse Open Jobs</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
      <p><a href="${BASE_URL}/settings/notifications">Manage email preferences</a></p>
      <p>Questions? <a href="mailto:support@mintenance.co.uk" style="color: #6b7280;">support@mintenance.co.uk</a></p>
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
      .lte('created_at', dormancyCutoff)
      .not('email', 'is', null)
      .contains('notification_preferences', { marketingEmails: true })
      .order('id')
      .limit(BATCH_LIMIT * 6);

    if (profileError) throw new Error('Win-back profile lookup unavailable');
    if (!profiles?.length) return [];

    const contractorIds = profiles
      .filter((p) => p.role === 'contractor')
      .map((p) => p.id);
    const homeownerIds = profiles
      .filter((p) => p.role === 'homeowner')
      .map((p) => p.id);

    // Step 2a: Contractors active in last 30 days (placed a bid)
    const { data: activeBids, error: bidsError } = await serverSupabase
      .from('bids')
      .select('contractor_id')
      .in('contractor_id', contractorIds)
      .gte('created_at', dormancyCutoff);

    if (bidsError) throw new Error('Win-back bid activity unavailable');
    const activeContractorIds = new Set(
      (activeBids || []).map((b) => b.contractor_id)
    );

    // Step 2b: Homeowners active in last 30 days (posted a job)
    const { data: activeJobs, error: jobsError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id')
      .in('homeowner_id', homeownerIds)
      .gte('created_at', dormancyCutoff);

    if (jobsError) throw new Error('Win-back job activity unavailable');
    const activeHomeownerIds = new Set(
      (activeJobs || []).map((j) => j.homeowner_id)
    );

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
    const { data: recentWinBacks, error: historyError } = await serverSupabase
      .from('notifications')
      .select('user_id')
      .in('user_id', dormantIds)
      .eq('type', 'win_back')
      .gte('created_at', cooldownCutoff);

    if (historyError) throw new Error('Win-back history unavailable');
    const recentlyContactedIds = new Set(
      (recentWinBacks || []).map((n) => n.user_id)
    );

    const { data: attempts, error: attemptsError } = await serverSupabase
      .from('win_back_deliveries')
      .select('user_id')
      .in('user_id', dormantIds)
      .gte('attempted_at', cooldownCutoff);
    if (attemptsError) throw new Error('Win-back delivery history unavailable');
    for (const attempt of attempts || [])
      recentlyContactedIds.add(attempt.user_id);
    return dormant.filter(
      (u) => !recentlyContactedIds.has(u.id)
    ) as DormantUser[];
  }

  /**
   * Send win-back email + in-app notification to all qualifying dormant users.
   */
  static async sendWinBackCampaign(): Promise<{
    sent: number;
    failed: number;
  }> {
    const dormantUsers = await this.getDormantUsers();

    if (dormantUsers.length === 0) {
      logger.info('No dormant users to re-engage', { service: 'win-back' });
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    let attempted = 0;
    for (const user of dormantUsers) {
      if (attempted >= BATCH_LIMIT) break;
      try {
        const recipient = await winBackRecipient(user.id);
        if (!recipient) continue;
        const { data: claimed, error: claimError } = await serverSupabase.rpc(
          'claim_win_back_delivery',
          { p_user_id: user.id }
        );
        if (claimError) throw new Error('Win-back delivery claim unavailable');
        if (!claimed) continue;
        attempted++;
        const firstName = escapeHtml(user.first_name || 'there');
        const isContractor = user.role === 'contractor';

        const html = isContractor
          ? buildContractorHtml(firstName)
          : buildHomeownerHtml(firstName);

        const subject = isContractor
          ? 'Explore current opportunities on Mintenance'
          : 'We miss you — your home deserves the best care';

        const actionUrl = isContractor ? '/contractor/jobs' : '/jobs/create';

        // Email channel (returns false on failure, does not throw)
        const delivered = await EmailService.sendEmail({
          to: recipient,
          subject,
          html,
        });
        const { error: checkpointError } = await serverSupabase
          .from('win_back_deliveries')
          .update({ status: delivered ? 'sent' : 'failed' })
          .eq('user_id', user.id)
          .eq('status', 'sending');
        if (checkpointError)
          logger.error('Win-back delivery checkpoint requires review', {
            service: 'win-back',
            userId: user.id,
          });
        if (!delivered) {
          failed++;
          continue;
        }
        sent++;

        // Optional in-app copy. The durable delivery claim prevents repeat email sends.
        try {
          await NotificationService.createNotification({
            userId: user.id,
            title: isContractor
              ? 'Explore current job listings'
              : 'We miss you on Mintenance!',
            message: isContractor
              ? 'Check current listings for work that suits your trade and availability.'
              : 'Post a job when you need help and compare any bids that arrive.',
            type: 'win_back',
            inAppOnly: true,
            actionUrl,
          });
        } catch (error) {
          logger.warn('Win-back email accepted, but in-app copy failed', {
            service: 'win-back',
            userId: user.id,
            error,
          });
        }
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
