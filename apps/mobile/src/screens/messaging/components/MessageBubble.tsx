/**
 * MessageBubble — brand sent bubbles + accented received bubbles.
 * Direction A · Mint Editorial — token-styled.
 *
 * Sent = Mint Editorial brand, received = surface with brand left
 * accent. Includes delivery status, image/file/system message types,
 * date separators.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Message,
  MessageDeliveryStatus,
} from '../../../services/MessagingService';
import VideoCallMessage from '../../../components/messaging/VideoCallMessage';
import { formatMessageTime } from '../utils';
import { DeliveryStatusIndicator } from './DeliveryStatusIndicator';
import { me } from '../../../design-system/mint-editorial';

interface MessageBubbleProps {
  item: Message;
  isFromCurrentUser: boolean;
  isDesktop: boolean;
  onCallAccept: (callId: string) => void;
  onCallDecline: (callId: string) => void;
  onRetry?: (message: Message) => void;
  showDateSeparator?: string;
}

function resolveDeliveryStatus(item: Message): MessageDeliveryStatus {
  if (item.deliveryStatus) return item.deliveryStatus;
  if (item.read) return 'read';
  if (item.id.startsWith('temp_message_')) return 'sending';
  return 'delivered';
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  item,
  isFromCurrentUser,
  isDesktop,
  onCallAccept,
  onCallDecline,
  onRetry,
  showDateSeparator,
}) => {
  // Date separator
  const dateSep = showDateSeparator ? (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{showDateSeparator}</Text>
      <View style={styles.dateLine} />
    </View>
  ) : null;

  if (item.messageType?.includes('video_call')) {
    return (
      <>
        {dateSep}
        <VideoCallMessage
          message={item}
          onCallAccept={onCallAccept}
          onCallDecline={onCallDecline}
          onViewCallDetails={() => {}}
        />
      </>
    );
  }

  const isFileMessage = item.messageType === 'file' && item.attachmentUrl;
  const isSystemMessage = (item.messageType as string) === 'system';
  const isImageAttachment = item.attachmentUrl && item.messageType !== 'file';

  const deliveryStatus = isFromCurrentUser
    ? resolveDeliveryStatus(item)
    : undefined;
  const isFailed = deliveryStatus === 'failed';

  const handleRetry = () => onRetry?.(item);

  // System message
  if (isSystemMessage) {
    return (
      <>
        {dateSep}
        <View style={styles.systemContainer}>
          <View style={styles.systemBubble}>
            <Ionicons name='information-circle' size={14} color={me.brand} />
            <Text style={styles.systemText}>{item.messageText}</Text>
          </View>
        </View>
      </>
    );
  }

  // File/document message
  if (isFileMessage) {
    const docName =
      item.messageText?.replace(/^Shared document:\s*/i, '') || 'Document';
    return (
      <>
        {dateSep}
        <View
          style={[
            styles.messageContainer,
            isFromCurrentUser
              ? styles.currentUserMessage
              : styles.otherUserMessage,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              { maxWidth: isDesktop ? '60%' : '78%' },
              isFromCurrentUser
                ? styles.currentUserBubble
                : styles.otherUserBubble,
              isFailed && styles.failedBubble,
            ]}
          >
            <View style={styles.documentRow}>
              <View
                style={[
                  styles.documentIcon,
                  isFromCurrentUser
                    ? styles.documentIconSent
                    : styles.documentIconReceived,
                ]}
              >
                <Ionicons
                  name='document-text'
                  size={20}
                  color={isFromCurrentUser ? me.onBrand : me.brand}
                />
              </View>
              <View style={styles.documentInfo}>
                <Text
                  style={[
                    styles.documentName,
                    isFromCurrentUser
                      ? styles.currentUserText
                      : styles.otherUserText,
                  ]}
                  numberOfLines={2}
                >
                  {docName}
                </Text>
                <Text
                  style={[
                    styles.documentLabel,
                    isFromCurrentUser
                      ? { color: 'rgba(255,255,255,0.6)' }
                      : { color: me.ink3 },
                  ]}
                >
                  Shared document
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.viewDocButton,
                isFromCurrentUser
                  ? styles.viewDocButtonSent
                  : styles.viewDocButtonReceived,
              ]}
              onPress={() =>
                item.attachmentUrl && Linking.openURL(item.attachmentUrl)
              }
              accessibilityRole='link'
              accessibilityLabel={`View document: ${docName}`}
            >
              <Ionicons
                name='open-outline'
                size={14}
                color={isFromCurrentUser ? me.onBrand : me.brand}
              />
              <Text
                style={[
                  styles.viewDocText,
                  isFromCurrentUser
                    ? { color: me.onBrand }
                    : { color: me.brand },
                ]}
              >
                View Document
              </Text>
            </TouchableOpacity>
            <View style={styles.metaRow}>
              <Text
                style={[
                  styles.messageTime,
                  isFromCurrentUser
                    ? styles.currentUserTime
                    : styles.otherUserTime,
                ]}
              >
                {formatMessageTime(item.createdAt)}
              </Text>
              {isFromCurrentUser && deliveryStatus && (
                <DeliveryStatusIndicator
                  status={deliveryStatus}
                  isFromCurrentUser
                  onRetry={handleRetry}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  }

  // Skip rendering empty messages (no text, no attachment)
  const hasContent = !!(item.messageText?.trim() || item.attachmentUrl);
  if (!hasContent) {
    return dateSep ? <>{dateSep}</> : null;
  }

  return (
    <>
      {dateSep}
      <View
        style={[
          styles.messageContainer,
          isFromCurrentUser
            ? styles.currentUserMessage
            : styles.otherUserMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            { maxWidth: isDesktop ? '60%' : '78%' },
            isFromCurrentUser
              ? styles.currentUserBubble
              : styles.otherUserBubble,
            isFailed && styles.failedBubble,
          ]}
        >
          {/* Received messages: brand accent line */}
          {!isFromCurrentUser && <View style={styles.accentLine} />}

          {!isFromCurrentUser && item.senderName && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}

          {/* Image attachment */}
          {isImageAttachment && (
            <Image
              source={{ uri: item.attachmentUrl }}
              style={styles.attachedImage}
              resizeMode='cover'
              accessibilityLabel='Attached image'
            />
          )}

          {/* Message text */}
          {item.messageText ? (
            <Text
              style={[
                styles.messageText,
                isFromCurrentUser
                  ? styles.currentUserText
                  : styles.otherUserText,
              ]}
            >
              {item.messageText}
            </Text>
          ) : null}

          {/* Time + delivery status */}
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.messageTime,
                isFromCurrentUser
                  ? styles.currentUserTime
                  : styles.otherUserTime,
              ]}
            >
              {formatMessageTime(item.createdAt)}
            </Text>
            {isFromCurrentUser && deliveryStatus && (
              <DeliveryStatusIndicator
                status={deliveryStatus}
                isFromCurrentUser
                onRetry={handleRetry}
              />
            )}
          </View>
        </View>

        {/* Failed indicator below bubble */}
        {isFailed && (
          <DeliveryStatusIndicator
            status='failed'
            isFromCurrentUser
            onRetry={handleRetry}
          />
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: me.line,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink3,
    letterSpacing: 0.3,
  },

  // System message
  systemContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: me.brandSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  systemText: {
    fontSize: 13,
    color: me.brand2,
    fontWeight: '500',
    maxWidth: '80%',
  },

  // Message layout
  messageContainer: {
    marginVertical: 3,
    paddingHorizontal: 4,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  currentUserBubble: {
    backgroundColor: me.brand,
    borderBottomRightRadius: 6,
  },
  otherUserBubble: {
    backgroundColor: me.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  failedBubble: {
    opacity: 0.7,
    borderWidth: 1.5,
    borderColor: me.errFg,
  },

  // Brand accent line for received messages
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: me.brand,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 6,
  },

  senderName: {
    fontSize: 11,
    color: me.brand,
    fontWeight: '600',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  currentUserText: {
    color: me.onBrand,
  },
  otherUserText: {
    color: me.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  currentUserTime: {
    color: 'rgba(255,255,255,0.6)',
  },
  otherUserTime: {
    color: me.ink3,
  },

  // Image attachment
  attachedImage: {
    width: 220,
    height: 160,
    borderRadius: 14,
    marginBottom: 6,
  },

  // Document message
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  documentIconSent: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  documentIconReceived: {
    backgroundColor: me.brandSoft,
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
    borderRadius: 12,
    marginBottom: 4,
    gap: 4,
  },
  viewDocButtonSent: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  viewDocButtonReceived: {
    backgroundColor: me.brandSoft,
  },
  viewDocText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
