import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../../services/MessagingService';
import VideoCallMessage from '../../../components/messaging/VideoCallMessage';
import { theme } from '../../../theme';
import { formatMessageTime } from '../utils';

interface MessageBubbleProps {
  item: Message;
  isFromCurrentUser: boolean;
  isDesktop: boolean;
  onCallAccept: (callId: string) => void;
  onCallDecline: (callId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  item,
  isFromCurrentUser,
  isDesktop,
  onCallAccept,
  onCallDecline,
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
  const isSystemMessage = item.messageType === 'system';
  const isImageAttachment = item.attachmentUrl && item.messageType !== 'file';

  // File/document message
  if (isFileMessage) {
    const docName = item.messageText?.replace(/^Shared document:\s*/i, '') || 'Document';
    return (
      <View style={[styles.messageContainer, isFromCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}>
        <View style={[styles.messageBubble, { maxWidth: isDesktop ? '60%' : '80%' }, isFromCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
          {!isFromCurrentUser && <Text style={styles.senderName}>{item.senderName}</Text>}
          <View style={styles.documentRow}>
            <View style={[styles.documentIcon, isFromCurrentUser ? styles.documentIconSent : styles.documentIconReceived]}>
              <Ionicons name="document-text" size={20} color={isFromCurrentUser ? 'rgba(255,255,255,0.8)' : theme.colors.primary} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={[styles.documentName, isFromCurrentUser ? styles.currentUserText : styles.otherUserText]} numberOfLines={2}>{docName}</Text>
              <Text style={[styles.documentLabel, isFromCurrentUser ? { color: 'rgba(255,255,255,0.5)' } : { color: theme.colors.textTertiary }]}>Shared document</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.viewDocButton, isFromCurrentUser ? styles.viewDocButtonSent : styles.viewDocButtonReceived]}
            onPress={() => item.attachmentUrl && Linking.openURL(item.attachmentUrl)}
            accessibilityRole="link"
            accessibilityLabel={`View document: ${docName}`}
          >
            <Ionicons name="open-outline" size={14} color={isFromCurrentUser ? '#FFFFFF' : theme.colors.primary} />
            <Text style={[styles.viewDocText, isFromCurrentUser ? { color: '#FFFFFF' } : { color: theme.colors.primary }]}>View Document</Text>
          </TouchableOpacity>
          <View style={styles.metaRow}>
            <Text style={[styles.messageTime, isFromCurrentUser ? styles.currentUserTime : styles.otherUserTime]}>{formatMessageTime(item.createdAt)}</Text>
            {isFromCurrentUser && (
              <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={13} color={item.read ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'} style={styles.readReceipt} />
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
            <Ionicons name="clipboard-outline" size={16} color={isFromCurrentUser ? 'rgba(255,255,255,0.7)' : theme.colors.primary} style={{ marginTop: 2 }} />
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
          {isFromCurrentUser && (
            <Ionicons
              name={item.read ? 'checkmark-done' : 'checkmark'}
              size={13}
              color={item.read ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'}
              style={styles.readReceipt}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  currentUserBubble: {
    backgroundColor: '#222222',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: theme.colors.surface,
  },
  otherUserText: {
    color: theme.colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.8)',
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
    borderRadius: 8,
    marginBottom: 4,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  documentIconSent: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  documentIconReceived: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  documentLabel: {
    fontSize: 11,
  },
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  viewDocButtonSent: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  viewDocButtonReceived: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  viewDocText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  systemBubbleSent: {
    backgroundColor: '#1a3a2a',
    borderBottomRightRadius: 4,
  },
  systemBubbleReceived: {
    backgroundColor: '#f0fdf4',
    borderBottomLeftRadius: 4,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
});
