import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message, MessageDeliveryStatus } from '../../../services/MessagingService';
import VideoCallMessage from '../../../components/messaging/VideoCallMessage';
import { theme } from '../../../theme';
import { formatMessageTime } from '../utils';

interface MessageBubbleProps {
  item: Message;
  isFromCurrentUser: boolean;
  isDesktop: boolean;
  onCallAccept: (callId: string) => void;
  onCallDecline: (callId: string) => void;
  onRetry?: (message: Message) => void;
}

/**
 * Resolves the effective delivery status for a sent message.
 * Server-fetched messages won't have `deliveryStatus` set, so we derive it
 * from the `read` flag and the presence of a temp id.
 */
function resolveDeliveryStatus(item: Message): MessageDeliveryStatus {
  if (item.deliveryStatus) return item.deliveryStatus;
  if (item.read) return 'read';
  // Messages with temp IDs that lack a deliveryStatus are still sending
  if (item.id.startsWith('temp_message_')) return 'sending';
  return 'delivered';
}

/**
 * Renders the delivery status indicator for sent messages.
 * - sending: small spinner + "Sending..." text
 * - sent/delivered: single checkmark (tertiary color)
 * - read: double checkmark (primary color)
 * - failed: warning icon + "Failed to send. Tap to retry"
 */
const DeliveryStatusIndicator: React.FC<{
  status: MessageDeliveryStatus;
  isFromCurrentUser: boolean;
  onRetry?: () => void;
}> = ({ status, isFromCurrentUser, onRetry }) => {
  if (!isFromCurrentUser) return null;

  if (status === 'failed') {
    return (
      <TouchableOpacity
        style={styles.failedRow}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry sending message"
      >
        <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
        <Text style={styles.failedText}>Failed to send. Tap to retry</Text>
      </TouchableOpacity>
    );
  }

  if (status === 'sending') {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator size={10} color={theme.colors.overlayWhite20} />
        <Text style={styles.sendingText}>Sending...</Text>
      </View>
    );
  }

  if (status === 'read') {
    return (
      <View style={styles.statusRow}>
        <View style={styles.doubleCheckContainer}>
          <Ionicons
            name="checkmark"
            size={12}
            color={theme.colors.primary}
            style={styles.checkFirst}
          />
          <Ionicons
            name="checkmark"
            size={12}
            color={theme.colors.primary}
            style={styles.checkSecond}
          />
        </View>
      </View>
    );
  }

  // sent / delivered — single checkmark
  return (
    <View style={styles.statusRow}>
      <Ionicons
        name="checkmark"
        size={12}
        color={theme.colors.textTertiary}
      />
    </View>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  item,
  isFromCurrentUser,
  isDesktop,
  onCallAccept,
  onCallDecline,
  onRetry,
}) => {
  if (item.messageType?.includes('video_call')) {
    return (
      <VideoCallMessage
        message={item}
        onCallAccept={onCallAccept}
        onCallDecline={onCallDecline}
        onViewCallDetails={() => {
          // Could navigate to call details screen
        }}
      />
    );
  }

  const isFileMessage = item.messageType === 'file' && item.attachmentUrl;
  const isSystemMessage = (item.messageType as string) === 'system';
  const isImageAttachment = item.attachmentUrl && item.messageType !== 'file';

  const deliveryStatus = isFromCurrentUser ? resolveDeliveryStatus(item) : undefined;
  const isFailed = deliveryStatus === 'failed';

  const handleRetry = () => onRetry?.(item);

  // File/document message
  if (isFileMessage) {
    const docName = item.messageText?.replace(/^Shared document:\s*/i, '') || 'Document';
    return (
      <View style={[styles.messageContainer, isFromCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}>
        <View style={[styles.messageBubble, { maxWidth: isDesktop ? '60%' : '80%' }, isFromCurrentUser ? styles.currentUserBubble : styles.otherUserBubble, isFailed && styles.failedBubble]}>
          {!isFromCurrentUser && <Text style={styles.senderName}>{item.senderName}</Text>}
          <View style={styles.documentRow}>
            <View style={[styles.documentIcon, isFromCurrentUser ? styles.documentIconSent : styles.documentIconReceived]}>
              <Ionicons name="document-text" size={20} color={isFromCurrentUser ? theme.colors.overlayWhite20 : theme.colors.primary} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={[styles.documentName, isFromCurrentUser ? styles.currentUserText : styles.otherUserText]} numberOfLines={2}>{docName}</Text>
              <Text style={[styles.documentLabel, isFromCurrentUser ? { color: theme.colors.overlayWhite20 } : { color: theme.colors.textTertiary }]}>Shared document</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.viewDocButton, isFromCurrentUser ? styles.viewDocButtonSent : styles.viewDocButtonReceived]}
            onPress={() => item.attachmentUrl && Linking.openURL(item.attachmentUrl)}
            accessibilityRole="link"
            accessibilityLabel={`View document: ${docName}`}
          >
            <Ionicons name="open-outline" size={14} color={isFromCurrentUser ? theme.colors.textInverse : theme.colors.primary} />
            <Text style={[styles.viewDocText, isFromCurrentUser ? { color: theme.colors.textInverse } : { color: theme.colors.primary }]}>View Document</Text>
          </TouchableOpacity>
          <View style={styles.metaRow}>
            <Text style={[styles.messageTime, isFromCurrentUser ? styles.currentUserTime : styles.otherUserTime]}>{formatMessageTime(item.createdAt)}</Text>
            {isFromCurrentUser && deliveryStatus && (
              <DeliveryStatusIndicator status={deliveryStatus} isFromCurrentUser onRetry={handleRetry} />
            )}
          </View>
        </View>
      </View>
    );
  }

  // System message (contract notifications, etc.)
  if (isSystemMessage) {
    return (
      <View style={[styles.messageContainer, isFromCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}>
        <View style={[styles.messageBubble, { maxWidth: isDesktop ? '60%' : '80%' }, isFromCurrentUser ? styles.systemBubbleSent : styles.systemBubbleReceived]}>
          <View style={styles.systemRow}>
            <Ionicons name="clipboard-outline" size={16} color={isFromCurrentUser ? theme.colors.overlayWhite20 : theme.colors.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.messageText, isFromCurrentUser ? styles.currentUserText : { color: theme.colors.primary }]}>{item.messageText}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.messageTime, isFromCurrentUser ? styles.currentUserTime : styles.otherUserTime]}>{formatMessageTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.messageContainer,
        isFromCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          { maxWidth: isDesktop ? '60%' : '80%' },
          isFromCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isFailed && styles.failedBubble,
        ]}
      >
        {!isFromCurrentUser && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        {isImageAttachment && (
          <Image
            source={{ uri: item.attachmentUrl }}
            style={styles.attachedImage}
            resizeMode="cover"
            accessibilityLabel="Attached image"
          />
        )}
        {item.messageText ? (
          <Text
            style={[
              styles.messageText,
              isFromCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {item.messageText}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text
            style={[
              styles.messageTime,
              isFromCurrentUser ? styles.currentUserTime : styles.otherUserTime,
            ]}
          >
            {formatMessageTime(item.createdAt)}
          </Text>
          {isFromCurrentUser && deliveryStatus && (
            <DeliveryStatusIndicator status={deliveryStatus} isFromCurrentUser onRetry={handleRetry} />
          )}
        </View>
      </View>
      {isFailed && (
        <DeliveryStatusIndicator status="failed" isFromCurrentUser onRetry={handleRetry} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: theme.spacing.xs,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing[3],
    borderRadius: 18,
  },
  currentUserBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.borderRadius.xs,
  },
  otherUserBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.borderRadius.xs,
    ...theme.shadows.sm,
  },
  failedBubble: {
    opacity: 0.7,
  },
  senderName: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  messageText: {
    fontSize: theme.typography.fontSize.base,
    lineHeight: 20,
  },
  currentUserText: {
    color: theme.colors.textInverse,
  },
  otherUserText: {
    color: theme.colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  messageTime: {
    fontSize: 11,
  },
  currentUserTime: {
    color: theme.colors.overlayWhite20,
  },
  otherUserTime: {
    color: theme.colors.textTertiary,
  },
  readReceipt: {
    marginLeft: 3,
  },
  attachedImage: {
    width: 200,
    height: 150,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  documentIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  documentIconSent: {
    backgroundColor: theme.colors.overlayWhite15,
  },
  documentIconReceived: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: 2,
  },
  documentLabel: {
    fontSize: 11,
  },
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  viewDocButtonSent: {
    backgroundColor: theme.colors.overlayWhite15,
  },
  viewDocButtonReceived: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  viewDocText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing.xs,
  },
  systemBubbleSent: {
    backgroundColor: theme.colors.primaryDark,
    borderBottomRightRadius: theme.borderRadius.xs,
  },
  systemBubbleReceived: {
    backgroundColor: theme.colors.primaryLight,
    borderBottomLeftRadius: theme.borderRadius.xs,
    ...theme.shadows.sm,
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  // Delivery status styles
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.xs,
  },
  sendingText: {
    fontSize: 10,
    color: theme.colors.overlayWhite20,
    marginLeft: 3,
  },
  doubleCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 18,
    height: 12,
  },
  checkFirst: {
    position: 'absolute',
    left: 0,
  },
  checkSecond: {
    position: 'absolute',
    left: 5,
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    paddingVertical: 2,
  },
  failedText: {
    fontSize: 11,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
  },
});
