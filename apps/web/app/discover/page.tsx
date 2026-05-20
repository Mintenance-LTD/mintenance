import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';

// Homeowner Discover was a misfit feature: the canonical job lifecycle is
// homeowner-posts -> contractors-bid -> homeowner-accepts. Homeowners do
// not swipe through contractors. The /discover route now exists only to
// preserve legacy bookmarks/links: contractors go to their discover, all
// others land on /dashboard or /login.
export default async function DiscoverRedirect() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect('/login');
  if (user.role === 'contractor') redirect('/contractor/discover');
  redirect('/dashboard');
}
