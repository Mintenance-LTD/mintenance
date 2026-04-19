/**
 * NeighbourhoodReferralService — R7 #8 of docs/RETENTION_ROADMAP_2026.md.
 *
 * A homeowner invites a neighbour with a code pinned to their postcode
 * prefix. When the neighbour completes their first job, we credit £20
 * to BOTH users via user_credits (pence-denominated ledger).
 *
 * Web + mobile both consume this via /api/referrals/* — do not talk to
 * the DB directly from UI.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export const REFERRAL_REWARD_PENCE = 2000; // £20

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_email: string | null;
  referred_user_id: string | null;
  postcode_prefix: string;
  code: string;
  status: 'issued' | 'redeemed' | 'rewarded' | 'expired' | 'revoked';
  first_job_id: string | null;
  reward_applied_at: string | null;
  expires_at: string;
  created_at: string;
}

/**
 * Normalise a UK postcode to its outward code (e.g. "M14 5AB" → "M14",
 * "sw1a 1aa" → "SW1A"). If the input doesn't look like a postcode we
 * return the trimmed upper-case form so the caller can still geofence.
 */
export function postcodePrefix(postcode: string): string {
  const s = postcode.replace(/\s+/g, '').toUpperCase();
  // UK outward code regex — 1-2 letters, 1-2 digits, optional trailing letter
  const m = s.match(/^[A-Z]{1,2}\d[A-Z\d]?/);
  return m ? m[0] : s.slice(0, 4);
}

/** 7-char random code like "7F3KQZW". Avoids 0/O/1/I ambiguity. */
function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 7; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export class NeighbourhoodReferralService {
  /**
   * Look up or create a referrer's live code for this postcode prefix.
   * Duplicate-safe: returns the existing code if one is still 'issued'
   * or 'redeemed'. Expired / revoked codes are not reused.
   */
  static async getOrCreate(
    referrerUserId: string,
    postcode: string,
    referredEmail?: string | null
  ): Promise<Referral> {
    const prefix = postcodePrefix(postcode);

    const { data: existing } = await serverSupabase
      .from('neighbourhood_referrals')
      .select('*')
      .eq('referrer_user_id', referrerUserId)
      .eq('postcode_prefix', prefix)
      .in('status', ['issued', 'redeemed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return existing as Referral;
    }

    // Try up to 5 times to avoid extremely-unlikely collisions.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = `${prefix}-${randomCode()}`;
      const { data, error } = await serverSupabase
        .from('neighbourhood_referrals')
        .insert({
          referrer_user_id: referrerUserId,
          referred_email: referredEmail?.toLowerCase().trim() || null,
          postcode_prefix: prefix,
          code,
        })
        .select('*')
        .single();
      if (!error && data) {
        return data as Referral;
      }
      // 23505 = duplicate key — retry with a new suffix.
      if (error && (error as { code?: string }).code !== '23505') {
        throw error;
      }
    }
    throw new Error('Could not generate a referral code');
  }

  /**
   * Look up a code by its public share token. Returns null when the code
   * doesn't exist / is expired / revoked — the landing page should show
   * a "link no longer valid" state.
   */
  static async lookup(code: string): Promise<Referral | null> {
    const { data } = await serverSupabase
      .from('neighbourhood_referrals')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle();
    if (!data) return null;
    if (data.status === 'expired' || data.status === 'revoked') return null;
    if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
    return data as Referral;
  }

  /**
   * Attach a neighbour to a code at signup / first-visit. Fails silently
   * when the referred_user_id has ALREADY redeemed a different code —
   * one signup = one redeem.
   */
  static async redeem(
    code: string,
    referredUserId: string
  ): Promise<Referral | null> {
    const ref = await this.lookup(code);
    if (!ref) return null;
    if (ref.referrer_user_id === referredUserId) return null; // no self-referral

    // Already redeemed by someone else → let the original stand.
    if (ref.referred_user_id && ref.referred_user_id !== referredUserId) {
      return null;
    }

    // Did this user already redeem a different referral?
    const { data: priorRedeem } = await serverSupabase
      .from('neighbourhood_referrals')
      .select('id')
      .eq('referred_user_id', referredUserId)
      .in('status', ['redeemed', 'rewarded'])
      .limit(1)
      .maybeSingle();
    if (priorRedeem) return null;

    const { data: updated, error } = await serverSupabase
      .from('neighbourhood_referrals')
      .update({
        referred_user_id: referredUserId,
        status: 'redeemed',
      })
      .eq('id', ref.id)
      .select('*')
      .single();
    if (error || !updated) return null;
    return updated as Referral;
  }

  /**
   * Called from the job completion flow: if this job's homeowner has a
   * redeemed referral AND this is their first completed job, credit
   * both parties £20 and mark the referral 'rewarded'. Idempotent.
   */
  static async applyRewardOnFirstJob(
    homeownerId: string,
    completedJobId: string
  ): Promise<boolean> {
    const { data: ref } = await serverSupabase
      .from('neighbourhood_referrals')
      .select('*')
      .eq('referred_user_id', homeownerId)
      .eq('status', 'redeemed')
      .limit(1)
      .maybeSingle();
    if (!ref) return false;

    // Guard: this homeowner must not already have a completed prior job.
    const { count: priorCompletedCount } = await serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('homeowner_id', homeownerId)
      .eq('status', 'completed')
      .neq('id', completedJobId);
    if ((priorCompletedCount ?? 0) > 0) return false;

    // Credit both parties.
    await this.creditUser(
      ref.referrer_user_id,
      REFERRAL_REWARD_PENCE,
      'referral_reward_referrer',
      ref.id
    );
    await this.creditUser(
      ref.referred_user_id as string,
      REFERRAL_REWARD_PENCE,
      'referral_reward_referred',
      ref.id
    );

    const { error: markErr } = await serverSupabase
      .from('neighbourhood_referrals')
      .update({
        status: 'rewarded',
        first_job_id: completedJobId,
        reward_applied_at: new Date().toISOString(),
      })
      .eq('id', ref.id);
    if (markErr) {
      logger.error('Failed to mark referral rewarded', markErr, {
        service: 'referrals',
        referralId: ref.id,
      });
      return false;
    }
    return true;
  }

  /**
   * Spend credit at payment time. Returns the amount actually debited
   * (may be less than requested if balance is lower). Service-role only
   * — callers must validate the user.
   */
  static async spendCredit(
    userId: string,
    requestedPence: number,
    reason: string,
    referenceId?: string | null
  ): Promise<number> {
    if (requestedPence <= 0) return 0;
    const { data: row } = await serverSupabase
      .from('user_credits')
      .select('balance_pence')
      .eq('user_id', userId)
      .maybeSingle();
    const balance = (row?.balance_pence as number | undefined) ?? 0;
    const debit = Math.min(balance, requestedPence);
    if (debit <= 0) return 0;

    const { error } = await serverSupabase
      .from('user_credits')
      .update({
        balance_pence: balance - debit,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (error) {
      logger.error('Failed to debit credit', error, {
        service: 'referrals',
        userId,
        debit,
      });
      return 0;
    }
    await serverSupabase.from('user_credit_ledger').insert({
      user_id: userId,
      delta_pence: -debit,
      reason,
      reference_id: referenceId ?? null,
    });
    return debit;
  }

  static async getBalancePence(userId: string): Promise<number> {
    const { data } = await serverSupabase
      .from('user_credits')
      .select('balance_pence')
      .eq('user_id', userId)
      .maybeSingle();
    return (data?.balance_pence as number | undefined) ?? 0;
  }

  private static async creditUser(
    userId: string,
    deltaPence: number,
    reason: string,
    referenceId?: string
  ): Promise<void> {
    const current = await this.getBalancePence(userId);
    const { error } = await serverSupabase.from('user_credits').upsert(
      {
        user_id: userId,
        balance_pence: current + deltaPence,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) {
      logger.error('Failed to credit user', error, {
        service: 'referrals',
        userId,
        deltaPence,
      });
      return;
    }
    await serverSupabase.from('user_credit_ledger').insert({
      user_id: userId,
      delta_pence: deltaPence,
      reason,
      reference_id: referenceId ?? null,
    });
  }
}
