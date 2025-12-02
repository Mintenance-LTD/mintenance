'use client';

import React, { useState } from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { ConversationCard } from '@/components/messaging/ConversationCard';
import { MessageCircle } from 'lucide-react';
import type { MessageThread } from '@mintenance/types';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface MessagesSidebarProps {
  customers: Customer[];
  messages: Message[];
  unreadCounts: Map<string, number>;
  currentUserId: string;
}

export function MessagesSidebar({
  customers,
  messages,
  unreadCounts,
  currentUserId,
}: MessagesSidebarProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Transform customers and messages into MessageThread format
  const conversations: MessageThread[] = customers.map((customer) => {
    const customerMessages = messages.filter(
      (m) =>
        (m.sender_id === customer.id && m.receiver_id === currentUserId) ||
        (m.sender_id === currentUserId && m.receiver_id === customer.id)
    );

    const lastMessage = customerMessages[0]; // Already sorted by created_at desc
    const unreadCount = unreadCounts.get(customer.id) || 0;
    const customerName = `${customer.first_name} ${customer.last_name}`;

    return {
      jobId: `customer-${customer.id}`, // Use customer ID as jobId for customer conversations
      jobTitle: `Conversation with ${customerName}`,
      participants: [
        {
          id: currentUserId,
          name: 'You',
          role: 'contractor',
        },
        {
          id: customer.id,
          name: customerName,
          role: 'homeowner',
          ...(customer.profile_image_url && { profile_image_url: customer.profile_image_url }),
        },
      ] as Array<{
        id: string;
        name: string;
        role: string;
        profile_image_url?: string;
      }>,
      unreadCount,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            senderId: lastMessage.sender_id,
            receiverId: lastMessage.receiver_id,
            messageText: lastMessage.content,
            content: lastMessage.content,
            messageType: 'text' as const,
            createdAt: lastMessage.created_at,
            readAt: lastMessage.read_at || undefined,
          }
        : undefined,
    };
  });

  // Sort by most recent message
  conversations.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <StandardCard>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.jobId}
                onClick={() => {
                  const customerId = conversation.participants.find((p) => p.id !== currentUserId)?.id;
                  if (customerId) setSelectedCustomerId(customerId);
                }}
                className="cursor-pointer"
              >
                <ConversationCard
                  conversation={conversation}
                  currentUserId={currentUserId}
                  onClick={() => {
                    const customerId = conversation.participants.find((p) => p.id !== currentUserId)?.id;
                    if (customerId) setSelectedCustomerId(customerId);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </StandardCard>
  );
}

