import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { CustomersTable } from './components/CustomersTable';
import { MessagesSidebar } from './components/MessagesSidebar';

export const metadata = {
  title: 'Customers | Mintenance',
  description: 'Manage your customers and conversations',
};

export default async function CustomersPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch all customers (homeowners the contractor has worked with)
  // Get from jobs, bids, and messages
  const [jobsData, bidsData, messagesData] = await Promise.all([
    serverSupabase
      .from('jobs')
      .select('homeowner_id, homeowner:homeowner_id (id, first_name, last_name, profile_image_url, email)')
      .eq('contractor_id', user.id)
      .not('homeowner_id', 'is', null),
    serverSupabase
      .from('bids')
      .select('homeowner_id, homeowner:homeowner_id (id, first_name, last_name, profile_image_url, email)')
      .eq('contractor_id', user.id)
      .not('homeowner_id', 'is', null),
    serverSupabase
      .from('messages')
      .select('sender_id, receiver_id, sender:sender_id (id, first_name, last_name, profile_image_url, email), receiver:receiver_id (id, first_name, last_name, profile_image_url, email)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
  ]);

  // Combine and deduplicate customers
  interface CustomerData {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    profile_image_url?: string;
  }

  interface JobWithHomeowner {
    homeowner?: CustomerData | CustomerData[];
  }

  interface BidWithHomeowner {
    homeowner?: CustomerData | CustomerData[];
  }

  interface MessageWithUsers {
    sender_id: string;
    sender?: CustomerData | CustomerData[];
    receiver?: CustomerData | CustomerData[];
  }

  const customerMap = new Map<string, CustomerData>();

  // Add customers from jobs
  ((jobsData.data || []) as JobWithHomeowner[]).forEach((job: JobWithHomeowner) => {
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    if (homeowner && homeowner.id) {
      customerMap.set(homeowner.id, homeowner);
    }
  });

  // Add customers from bids
  ((bidsData.data || []) as BidWithHomeowner[]).forEach((bid: BidWithHomeowner) => {
    const homeowner = Array.isArray(bid.homeowner) ? bid.homeowner[0] : bid.homeowner;
    if (homeowner && homeowner.id) {
      customerMap.set(homeowner.id, homeowner);
    }
  });

  // Add customers from messages
  ((messagesData.data || []) as MessageWithUsers[]).forEach((message: MessageWithUsers) => {
    const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender;
    const receiver = Array.isArray(message.receiver) ? message.receiver[0] : message.receiver;
    const otherUser = message.sender_id === user.id ? receiver : sender;
    if (otherUser && otherUser.id && otherUser.id !== user.id) {
      customerMap.set(otherUser.id, otherUser);
    }
  });

  const customers = Array.from(customerMap.values()).map((c) => ({
    id: c.id,
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    email: c.email || '',
    profile_image_url: c.profile_image_url || null,
  }));

  // Fetch message threads for each customer
  const customerIds = customers.map((c) => c.id);
  const { data: recentMessages } = await serverSupabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, created_at, read_at')
    .or(`sender_id.in.(${customerIds.join(',')}),receiver_id.in.(${customerIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(100);

  // Calculate unread counts per customer
  const unreadCounts = new Map<string, number>();
  recentMessages?.forEach((message) => {
    if (message.receiver_id === user.id && !message.read_at) {
      const customerId = message.sender_id;
      unreadCounts.set(customerId, (unreadCounts.get(customerId) || 0) + 1);
    }
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-600 mt-1">
          {customers.length} total {customers.length === 1 ? 'customer' : 'customers'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customers Table - Left (2/3 width on large screens) */}
        <div className="lg:col-span-2">
          <CustomersTable customers={customers} />
        </div>

        {/* Messages Sidebar - Right (1/3 width on large screens) */}
        <div className="lg:col-span-1">
          <MessagesSidebar
            customers={customers}
            messages={recentMessages || []}
            unreadCounts={unreadCounts}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  );
}

