import React from 'react';
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
  const otherParticipant = conversation.participants.find(
    (p) => p.id !== currentUserId
  );

  const displayName = otherParticipant?.name ?? 'Unknown User';
  const avatarInitial = otherParticipant?.name
    ? otherParticipant.name.charAt(0).toUpperCase()
    : '?';

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const truncateMessage = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'contractor':
        return '🔧';
      case 'homeowner':
        return '🏠';
      default:
        return '👤';
    }
  };

  const roleIcon = getRoleIcon(otherParticipant?.role ?? '');

  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const { messageText, messageType } = conversation.lastMessage;
    const isCurrentUserSender = conversation.lastMessage.senderId === currentUserId;
    const prefix = isCurrentUserSender ? 'You: ' : '';

    switch (messageType) {
      case 'image':
        return `${prefix}📷 Photo`;
      case 'file':
        return `${prefix}📎 File`;
      case 'video_call_invitation':
        return `${prefix}📞 Video call invitation`;
      case 'video_call_started':
        return `${prefix}🎥 Video call started`;
      case 'video_call_ended':
        return `${prefix}📞 Call ended`;
      case 'video_call_missed':
        return `${prefix}📞 Missed call`;
      default:
        return `${prefix}${truncateMessage(messageText)}`;
    }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center p-4 border-b border-gray-200 cursor-pointer bg-white transition-colors duration-200 hover:bg-gray-50"
    >
      {/* Profile Avatar - Clickable */}
      <div
        onClick={(e) => {
          e.stopPropagation(); // Prevent double-triggering
          onClick();
        }}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
          fontSize: theme.typography.fontSize.lg,
          color: theme.colors.white,
          fontWeight: theme.typography.fontWeight.bold,
          flexShrink: 0,
          cursor: 'pointer',
        }}
        title={`Click to message ${displayName}`}
      >
        {avatarInitial}
      </div>

      {/* Conversation Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header with name and timestamp */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <span
              onClick={(e) => {
                e.stopPropagation(); // Prevent double-triggering
                onClick();
              }}
              className={`text-base mr-2 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer ${
                conversation.unreadCount > 0
                  ? 'font-[560] text-gray-900'
                  : 'font-[460] text-gray-700'
              }`}
              title={`Click to message ${displayName}`}
            >
              {displayName}
            </span>
            <span style={{ fontSize: '12px' }}>
              {roleIcon}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {conversation.lastMessage && (
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginRight: theme.spacing.xs,
                }}
              >
                {formatTime(conversation.lastMessage.createdAt)}
              </span>
            )}
            {conversation.unreadCount > 0 && (
              <div
                style={{
                  backgroundColor: theme.colors.error,
                  color: theme.colors.white,
                  borderRadius: '10px',
                  minWidth: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                  padding: '0 6px',
                }}
              >
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </div>
            )}
          </div>
        </div>

        {/* Job title */}
        <div
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          📋 {conversation.jobTitle}
        </div>

        {/* Last message preview */}
        <div
          className={`text-sm overflow-hidden text-ellipsis whitespace-nowrap ${
            conversation.unreadCount > 0
              ? 'font-[560] text-gray-900'
              : 'font-[460] text-gray-600'
          }`}
        >
          {getLastMessagePreview()}
        </div>
      </div>
    </div>
  );
};
