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
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottom: `1px solid ${theme.colors.border}`,
        cursor: 'pointer',
        backgroundColor: theme.colors.white,
        transition: 'background-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.white;
      }}
    >
      {/* Profile Avatar */}
      <div
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
        }}
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
              style={{
                fontSize: theme.typography.fontSize.base,
                fontWeight: conversation.unreadCount > 0
                  ? theme.typography.fontWeight.bold
                  : theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginRight: theme.spacing.xs,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
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
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: conversation.unreadCount > 0
              ? theme.colors.text
              : theme.colors.textSecondary,
            fontWeight: conversation.unreadCount > 0
              ? theme.typography.fontWeight.medium
              : theme.typography.fontWeight.normal,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {getLastMessagePreview()}
        </div>
      </div>
    </div>
  );
};
