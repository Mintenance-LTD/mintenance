import React from 'react';
import { theme } from '@/lib/theme';
import type { Message } from '@mintenance/types';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showSender?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showSender = false,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageTypeIcon = () => {
    switch (message.messageType) {
      case 'image':
        return '📷';
      case 'file':
        return '📎';
      case 'video_call_invitation':
        return '📞';
      case 'video_call_started':
        return '🎥';
      case 'video_call_ended':
        return '📞';
      case 'video_call_missed':
        return '📞';
      default:
        return null;
    }
  };

  const isSystemMessage = message.messageType.includes('video_call');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
        marginBottom: theme.spacing.sm,
        width: '100%',
      }}
    >
      {/* Sender name (for group chats or when requested) */}
      {showSender && !isCurrentUser && (
        <div
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
            marginBottom: '2px',
            marginLeft: theme.spacing.xs,
          }}
        >
          {message.senderName}
        </div>
      )}

      {/* Message bubble */}
      <div
        style={{
          maxWidth: '70%',
          minWidth: '100px',
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.lg,
          backgroundColor: isCurrentUser
            ? isSystemMessage
              ? theme.colors.backgroundSecondary
              : theme.colors.primary
            : theme.colors.backgroundSecondary,
          color: isCurrentUser && !isSystemMessage
            ? theme.colors.white
            : theme.colors.text,
          position: 'relative',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          ...(isSystemMessage && {
            backgroundColor: theme.colors.backgroundTertiary,
            color: theme.colors.textSecondary,
            fontStyle: 'italic',
            textAlign: 'center' as const,
          }),
        }}
      >
        {/* Message type icon */}
        {getMessageTypeIcon() && (
          <span style={{ marginRight: theme.spacing.xs }}>
            {getMessageTypeIcon()}
          </span>
        )}

        {/* Message text */}
        <div
          style={{
            fontSize: theme.typography.fontSize.base,
            lineHeight: theme.typography.lineHeight.relaxed,
          }}
        >
          {message.messageText}
        </div>

        {/* Attachment handling */}
        {message.attachmentUrl && (
          <div style={{ marginTop: theme.spacing.xs }}>
            {message.messageType === 'image' ? (
              <img
                src={message.attachmentUrl}
                alt="Attachment"
                style={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  borderRadius: theme.borderRadius.md,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: isCurrentUser ? theme.colors.white : theme.colors.primary,
                  textDecoration: 'underline',
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                📎 View Attachment
              </a>
            )}
          </div>
        )}

        {/* Video call details */}
        {message.callDuration && (
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: '2px',
            }}
          >
            Duration: {formatCallDuration(message.callDuration)}
          </div>
        )}

        {/* Message time and read status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '4px',
            fontSize: theme.typography.fontSize.xs,
            color: isCurrentUser && !isSystemMessage
              ? 'rgba(255, 255, 255, 0.7)'
              : theme.colors.textSecondary,
          }}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isCurrentUser && (
            <span style={{ marginLeft: theme.spacing.xs }}>
              {message.read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to format call duration
function formatCallDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}
