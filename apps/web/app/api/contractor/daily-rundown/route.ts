import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler({ roles: ['contractor'] }, async (_req, { user }) => {
  const supabase = serverSupabase;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [bidsResult, jobsResult, messagesResult, notificationsResult, reviewsResult, earningsResult] = await Promise.all([
    supabase.from('bids').select('id, status, amount, updated_at, jobs!inner(title, status)').eq('contractor_id', user.id).in('status', ['pending', 'accepted', 'rejected']),
    supabase.from('jobs').select('id, title, status, created_at, updated_at').eq('contractor_id', user.id).in('status', ['assigned', 'in_progress']),
    supabase.from('messages').select('id, created_at', { count: 'exact', head: true }).eq('recipient_id', user.id).is('read_at', null),
    supabase.from('notifications').select('id, type, title, created_at', { count: 'exact' }).eq('user_id', user.id).eq('read', false).gte('created_at', todayISO).order('created_at', { ascending: false }).limit(5),
    supabase.from('reviews').select('id, rating, comment, created_at').eq('contractor_id', user.id).gte('created_at', todayISO),
    supabase.from('escrow_transactions').select('amount').eq('contractor_id', user.id).eq('status', 'released').gte('updated_at', todayISO),
  ]);

  const bids = bidsResult.data || [];
  const pendingBids = bids.filter(b => b.status === 'pending');
  const acceptedToday = bids.filter(b => b.status === 'accepted' && b.updated_at >= todayISO);
  const rejectedToday = bids.filter(b => b.status === 'rejected' && b.updated_at >= todayISO);
  const jobs = jobsResult.data || [];
  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const assignedJobs = jobs.filter(j => j.status === 'assigned');
  const todayEarnings = (earningsResult.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  const rundown = {
    date: new Date().toISOString().split('T')[0],
    greeting: getGreeting(),
    stats: { pendingBids: pendingBids.length, acceptedToday: acceptedToday.length, rejectedToday: rejectedToday.length, activeJobs: activeJobs.length, assignedJobs: assignedJobs.length, unreadMessages: messagesResult.count || 0, unreadNotifications: notificationsResult.count || 0, newReviews: (reviewsResult.data || []).length, todayEarnings },
    highlights: buildHighlights({ acceptedToday, assignedJobs, activeJobs, pendingBids, unreadMessages: messagesResult.count || 0, newReviews: reviewsResult.data || [], todayEarnings, notifications: notificationsResult.data || [] }),
  };

  return NextResponse.json(rundown);
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface HighlightInput {
  acceptedToday: Array<{ amount: number; jobs: unknown }>;
  assignedJobs: Array<{ id: string; title: string }>;
  activeJobs: Array<{ id: string; title: string }>;
  pendingBids: Array<{ id: string }>;
  unreadMessages: number;
  newReviews: Array<{ rating: number; comment: string }>;
  todayEarnings: number;
  notifications: Array<{ type: string; title: string }>;
}

function buildHighlights(data: HighlightInput): string[] {
  const highlights: string[] = [];
  if (data.acceptedToday.length > 0) highlights.push(`${data.acceptedToday.length} bid${data.acceptedToday.length > 1 ? 's' : ''} accepted today`);
  if (data.assignedJobs.length > 0) highlights.push(`${data.assignedJobs.length} job${data.assignedJobs.length > 1 ? 's' : ''} awaiting start`);
  if (data.activeJobs.length > 0) highlights.push(`${data.activeJobs.length} job${data.activeJobs.length > 1 ? 's' : ''} in progress`);
  if (data.pendingBids.length > 0) highlights.push(`${data.pendingBids.length} pending bid${data.pendingBids.length > 1 ? 's' : ''} awaiting response`);
  if (data.unreadMessages > 0) highlights.push(`${data.unreadMessages} unread message${data.unreadMessages > 1 ? 's' : ''}`);
  if (data.newReviews.length > 0) { const avgRating = data.newReviews.reduce((s, r) => s + r.rating, 0) / data.newReviews.length; highlights.push(`New ${avgRating.toFixed(1)}-star review received`); }
  if (data.todayEarnings > 0) highlights.push(`£${(data.todayEarnings / 100).toFixed(2)} released to your account today`);
  if (highlights.length === 0) highlights.push('No new updates yet today. Check back later!');
  return highlights;
}
