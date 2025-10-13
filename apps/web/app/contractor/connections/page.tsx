import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ConnectionsClient } from './components/ConnectionsClient';
import { createServerSupabaseClient } from '@/lib/api/supabaseServer';

export default async function ConnectionsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const serverSupabase = createServerSupabaseClient();

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

  const connectionRequests = requests?.map(req => ({
    id: req.id,
    requester: {
      id: req.requester?.id || '',
      name: `${req.requester?.first_name || ''} ${req.requester?.last_name || ''}`.trim(),
      email: req.requester?.email || '',
      role: req.requester?.role || 'homeowner',
    },
    status: req.status,
    createdAt: req.created_at,
  })) || [];

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
    const isRequester = conn.requester?.id === user.id;
    const connection = isRequester ? conn.target : conn.requester;

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
