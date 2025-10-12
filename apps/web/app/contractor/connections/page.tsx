import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ConnectionsClient } from './components/ConnectionsClient';

export default async function ConnectionsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const connectionRequests: any[] = [];
  const mutualConnections: any[] = [];

  return (
    <ConnectionsClient
      connectionRequests={connectionRequests}
      mutualConnections={mutualConnections}
    />
  );
}
