import React from 'react';
import { Image as ImageIcon, Paperclip, Phone, Video } from 'lucide-react';
import { theme } from '@/lib/theme';
import type { MessageThread } from '@mintenance/types';

interface ConversationCardProps {
  conversation: MessageThread;
  currentUserId: string;
  onClick: () => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  currentUserId,
  onClick,
}) => {
  const otherParticipant = (conversation.participants || []).find(
    (p: { id: string }) => p.id !== currentUserId
  ) as { id: string; name: string; role: string; profile_image_url?: string } | undefined;

  const displayName = otherParticipant?.name ?? 'Unknown User';
  const avatarInitial = otherParticipant?.name
    ? otherParticipant.name.charAt(0).toUpperCase()
    : '?';

  const truncateMessage = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const messageText = conversation.lastMessage.messageText || conversation.lastMessage.content || '';
    const messageType = conversation.lastMessage.messageType;

    switch (messageType) {
      case 'image':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ImageIcon size={14} /> Photo
          </span>
        );
      case 'file':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Paperclip size={14} /> File
          </span>
        );
      case 'system':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={14} /> System message
          </span>
        );
      default:
        return truncateMessage(messageText, 50);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-GB');
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center p-4 cursor-pointer bg-white transition-colors duration-200 hover:bg-gray-50"
      style={{ padding: '16px 24px' }}
    >
      {/* Profile Avatar - Left Side */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: otherParticipant?.profile_image_url ? 'transparent' : '#14b8a6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '16px',
          fontSize: '18px',
          color: '#FFFFFF',
          fontWeight: 600,
          flexShrink: 0,
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {otherParticipant?.profile_image_url ? (
          <img
            src={otherParticipant.profile_image_url}
            alt={displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          avatarInitial
        )}
      </div>

      {/* Conversation Details - Right Side */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Sender Name */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </div>

        {/* Message Preview */}
        <div
          style={{
            fontSize: '14px',
            color: '#6B7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.5,
          }}
        >
          {getLastMessagePreview()}
        </div>
      </div>

      {/* Right Side: Timestamp and Unread Badge */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-end', 
        gap: '8px',
        flexShrink: 0,
        marginLeft: '16px',
      }}>
        {conversation.lastMessage && (
          <span
            style={{
              fontSize: '12px',
              color: '#6B7280',
            }}
          >
            {formatTimeAgo(conversation.lastMessage.createdAt)}
          </span>
        )}
        {(conversation.unreadCount ?? 0) > 0 && (
          <div
            style={{
              backgroundColor: '#14b8a6',
              color: '#FFFFFF',
              borderRadius: '50%',
              minWidth: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              padding: '0 8px',
            }}
          >
            {(conversation.unreadCount ?? 0) > 99 ? '99+' : conversation.unreadCount}
          </div>
        )}
      </div>
    </div>
  );
};
