'use client';

import React, { useEffect, useState } from 'react';
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  // 2026-05-13 polish pass: editorial branching to swap StandardCard +
  // legacy heading typography for canonical .card.card-pad + .t-h3.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

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
          ...(customer.profile_image_url && {
            profile_image_url: customer.profile_image_url,
          }),
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
    const aTime = a.lastMessage?.createdAt
      ? new Date(a.lastMessage.createdAt).getTime()
      : 0;
    const bTime = b.lastMessage?.createdAt
      ? new Date(b.lastMessage.createdAt).getTime()
      : 0;
    return bTime - aTime;
  });

  const inner = (
    <>
      <div
        className={isMintEditorial ? 'row' : 'flex items-center gap-2 mb-4'}
        style={
          isMintEditorial
            ? { gap: 8, alignItems: 'center', marginBottom: 12 }
            : undefined
        }
      >
        <MessageCircle
          className={isMintEditorial ? undefined : 'h-5 w-5 text-gray-600'}
          size={isMintEditorial ? 18 : undefined}
          strokeWidth={isMintEditorial ? 1.75 : undefined}
          style={isMintEditorial ? { color: 'var(--me-ink-2)' } : undefined}
        />
        <h3
          className={
            isMintEditorial ? 't-h3' : 'text-lg font-semibold text-gray-900'
          }
          style={isMintEditorial ? { margin: 0 } : undefined}
        >
          Recent messages
        </h3>
      </div>

      {conversations.length === 0 ? (
        <div
          className={isMintEditorial ? undefined : 'text-center py-8'}
          style={
            isMintEditorial
              ? { textAlign: 'center', padding: '24px 0' }
              : undefined
          }
        >
          <p
            className={isMintEditorial ? 't-meta' : 'text-sm text-gray-500'}
            style={isMintEditorial ? { margin: 0 } : undefined}
          >
            No messages yet
          </p>
        </div>
      ) : (
        <div
          className={isMintEditorial ? undefined : 'space-y-2'}
          style={
            isMintEditorial
              ? { display: 'flex', flexDirection: 'column', gap: 8 }
              : undefined
          }
        >
          {conversations.map((conversation) => (
            <div
              key={conversation.jobId}
              onClick={() => {
                const customerId = (conversation.participants || []).find(
                  (p) => p.id !== currentUserId
                )?.id;
                if (customerId) setSelectedCustomerId(customerId);
              }}
              className='cursor-pointer'
            >
              <ConversationCard
                conversation={conversation}
                currentUserId={currentUserId}
                onClick={() => {
                  const customerId = (conversation.participants || []).find(
                    (p) => p.id !== currentUserId
                  )?.id;
                  if (customerId) setSelectedCustomerId(customerId);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (isMintEditorial) {
    return <div className='card card-pad'>{inner}</div>;
  }

  return (
    <StandardCard>
      <div className='space-y-4'>{inner}</div>
    </StandardCard>
  );
}
