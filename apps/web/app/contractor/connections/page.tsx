import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ConnectionsClient } from './components/ConnectionsClient';
import { serverSupabase } from '@/lib/api/supabaseServer';

export default async function ConnectionsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Get pending connection requests (where current user is the target)
  const { data: requests } = await serverSupabase
    .from('connections')
    .select(`
      id,
      status,
      created_at,
      requester:requester_id (
        id,
        email,
        first_name,
        last_name,
        role
      )
    `)
    .eq('target_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const connectionRequests = requests?.map(req => {
    const requester = Array.isArray(req.requester) ? req.requester[0] : req.requester;
    return {
      id: req.id,
      requester: {
        id: requester?.id || '',
        name: `${requester?.first_name || ''} ${requester?.last_name || ''}`.trim(),
        email: requester?.email || '',
        role: requester?.role || 'homeowner',
      },
      status: req.status,
      createdAt: req.created_at,
    };
  }) || [];

  // Get accepted connections (mutual connections)
  const { data: accepted } = await serverSupabase
    .from('connections')
    .select(`
      id,
      created_at,
      requester:requester_id (
        id,
        email,
        first_name,
        last_name,
        role
      ),
      target:target_id (
        id,
        email,
        first_name,
        last_name,
        role
      )
    `)
    .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  const mutualConnections = accepted?.map(conn => {
    // Determine which user is the connection (not the current user)
    const requester = Array.isArray(conn.requester) ? conn.requester[0] : conn.requester;
    const target = Array.isArray(conn.target) ? conn.target[0] : conn.target;
    const isRequester = requester?.id === user.id;
    const connection = isRequester ? target : requester;

    return {
      id: conn.id,
      user: {
        id: connection?.id || '',
        name: `${connection?.first_name || ''} ${connection?.last_name || ''}`.trim(),
        email: connection?.email || '',
        role: connection?.role || 'homeowner',
      },
      connectedAt: conn.created_at,
    };
  }) || [];

  return (
    <ConnectionsClient
      connectionRequests={connectionRequests}
      mutualConnections={mutualConnections}
    />
  );
}
