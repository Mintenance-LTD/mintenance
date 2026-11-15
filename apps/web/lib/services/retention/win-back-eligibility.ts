import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  loadPreferences,
  isTypeDisabled,
  nextQuietHoursEndUTC,
} from '../notifications/NotificationPreferenceResolver';

/** A read error defers delivery. A profile email is never authority for a recipient. */
export async function winBackRecipient(
  userId: string,
  now = Date.now()
): Promise<string | null> {
  const prefs = await loadPreferences(userId);
  if (
    !prefs.email_enabled ||
    isTypeDisabled(prefs, 'win_back') ||
    nextQuietHoursEndUTC(prefs)
  )
    return null;
  const [
    { data: profile, error: profileError },
    { data: emailPrefs, error: emailError },
    { data: account, error: accountError },
  ] = await Promise.all([
    serverSupabase
      .from('profiles')
      .select('created_at,deleted_at,notification_preferences')
      .eq('id', userId)
      .maybeSingle(),
    serverSupabase
      .from('email_preferences')
      .select('unsubscribed_all,marketing')
      .eq('user_id', userId)
      .maybeSingle(),
    serverSupabase.auth.admin.getUserById(userId),
  ]);
  if (profileError || emailError || accountError)
    throw new Error('Win-back eligibility unavailable');
  const user = account?.user;
  const cutoff = now - 30 * 86400000;
  if (
    !profile ||
    profile.deleted_at ||
    !Number.isFinite(Date.parse(profile.created_at)) ||
    Date.parse(profile.created_at) > cutoff
  )
    return null;
  const legacy = profile.notification_preferences as Record<
    string,
    unknown
  > | null;
  // Marketing opt-in is explicit; general transactional email defaults are not consent.
  if (
    legacy?.emailEnabled === false ||
    legacy?.marketingEmails !== true ||
    legacy?.promotionalEmails === false ||
    emailPrefs?.unsubscribed_all ||
    emailPrefs?.marketing === false
  )
    return null;
  if (
    !user?.email ||
    !user.email_confirmed_at ||
    (user.banned_until && Date.parse(user.banned_until) > now)
  )
    return null;
  if (
    user.last_sign_in_at &&
    (!Number.isFinite(Date.parse(user.last_sign_in_at)) ||
      Date.parse(user.last_sign_in_at) > cutoff)
  )
    return null;
  return user.email;
}
