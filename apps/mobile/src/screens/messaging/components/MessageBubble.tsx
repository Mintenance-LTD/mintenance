import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
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
        {item.attachmentUrl && (
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
});
