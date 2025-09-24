import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../utils/logger';
import { Banner } from '../components/ui/Banner';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../services/MessagingService';
import { VideoCallService } from '../services/VideoCallService';
import VideoCallMessage from '../components/messaging/VideoCallMessage';
import VideoCallInterface from '../components/video-call/VideoCallInterface';
import VideoCallScheduler from '../components/video-call/VideoCallScheduler';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import {
  useJobMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useRealTimeMessages,
} from '../hooks/useMessaging';
import {
  ResponsiveContainer,
  useResponsive
} from '../components/responsive';

interface MessagingScreenParams {
  jobId: string;
  jobTitle: string;
  otherUserId: string;
  otherUserName: string;
}

interface Props {
  route: RouteProp<{ params: MessagingScreenParams }>;
  navigation: StackNavigationProp<any>;
}

const MessagingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, jobTitle, otherUserId, otherUserName } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDesktop, isTablet } = useResponsive();

  const [newMessage, setNewMessage] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Use messaging hooks
  const {
    data: messages = [],
    isLoading: loading,
    error,
  } = useJobMessages(jobId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkMessagesAsRead();

  // Real-time message subscription
  useRealTimeMessages(
    jobId,
    (newMessage) => {
      // Auto-scroll to new messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Mark as read if it's not from current user
      if (newMessage.senderId !== user?.id && user?.id) {
        markAsReadMutation.mutate({ jobId, userId: user.id });
      }
    },
    () => {}, // onMessageUpdate - handled by React Query cache
    true // enabled
  );

  // Mark messages as read when screen is focused
  useEffect(() => {
    if (user?.id && messages.length > 0) {
      const unreadMessages = messages.some(
        (msg: any) => !msg.read && msg.receiverId === user.id
      );
      if (unreadMessages) {
        markAsReadMutation.mutate({ jobId, userId: user.id });
      }
    }
  }, [messages, user?.id, jobId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sendMessageMutation.isPending) return;

    const messageText = newMessage.trim();
    setComposerError(null);
    setNewMessage('');

    try {
      await sendMessageMutation.mutateAsync({
        jobId,
        receiverId: otherUserId,
        messageText,
        senderId: user.id,
        messageType: 'text',
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      logger.error('Error sending message:', error);
      setComposerError('Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message on failure
    }
  };

  const startVideoCall = async () => {
    if (!user || VideoCallService.isUserInCall(user.id)) {
      Alert.alert('Call in Progress', 'You are already in a video call.');
      return;
    }

    try {
      const call = await VideoCallService.startInstantCall(
        jobId,
        user.id,
        [user.id, otherUserId],
        'consultation'
      );

      if (call.data) {
        // Send video call invitation message
        await sendMessageMutation.mutateAsync({
          jobId,
          receiverId: otherUserId,
          messageText: `${user.first_name || 'Someone'} started a video call`,
          senderId: user.id,
          messageType: 'video_call_invitation',
          callId: call.data.id,
        });

        setActiveCallId(call.data.id);
        setIsVideoCallActive(true);
        logger.info('Video call started', { callId: call.data.id });

        // Auto-scroll to show the call message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      logger.error('Failed to start video call:', error);
      Alert.alert(
        'Error',
        'Failed to start video call. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCallAccept = async (callId: string) => {
    if (!user) return;

    try {
      setActiveCallId(callId);
      setIsVideoCallActive(true);
      logger.info('Joining video call', { callId });
    } catch (error) {
      logger.error('Failed to join video call:', error);
      Alert.alert('Error', 'Failed to join video call. Please try again.');
    }
  };

  const handleCallDecline = async (callId: string) => {
    try {
      await VideoCallService.cancelCall(callId, user?.id || '', 'declined');
      logger.info('Video call declined', { callId });
    } catch (error) {
      logger.error('Failed to decline video call:', error);
    }
  };

  const handleCallEnd = async () => {
    if (activeCallId && user) {
      try {
        // Get call duration from VideoCallService if available
        const callData = VideoCallService.getActiveCall();
        const duration = callData?.duration || 0;

        // Send video call ended message
        await sendMessageMutation.mutateAsync({
          jobId,
          receiverId: otherUserId,
          messageText: duration > 0
            ? `Video call ended (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`
            : 'Video call ended',
          senderId: user.id,
          messageType: 'video_call_ended',
          callId: activeCallId,
          callDuration: duration,
        });

        // Auto-scroll to show the call ended message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        logger.error('Failed to send call ended message:', error);
      }
    }

    setIsVideoCallActive(false);
    setActiveCallId(null);
    logger.info('Video call ended from messaging screen');
  };

  const handleCallError = (error: string) => {
    logger.error('Video call error:', error);
    setIsVideoCallActive(false);
    setActiveCallId(null);
    Alert.alert('Video Call Error', error);
  };

  const handleCallScheduled = async (callId: string, scheduledTime: Date) => {
    if (!user) return;

    try {
      // Send scheduled call message
      await sendMessageMutation.mutateAsync({
        jobId,
        receiverId: otherUserId,
        messageText: `${user.first_name || 'Someone'} scheduled a video call for ${scheduledTime.toLocaleDateString()} at ${scheduledTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        senderId: user.id,
        messageType: 'video_call_scheduled',
        callId,
        scheduledTime: scheduledTime.toISOString(),
      });

      // Auto-scroll to show the scheduled call message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      logger.info('Video call scheduled message sent', { callId, scheduledTime });
    } catch (error) {
      logger.error('Failed to send scheduled call message:', error);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isFromCurrentUser = item.senderId === user?.id;

    // Handle video call messages
    if (item.messageType?.includes('video_call')) {
      return (
        <VideoCallMessage
          message={item}
          onCallAccept={handleCallAccept}
          onCallDecline={handleCallDecline}
          onViewCallDetails={(callId) => {
            logger.info('View call details', { callId });
            // Could navigate to call details screen
          }}
        />
      );
    }

    // Regular text messages
    return (
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
            { maxWidth: isDesktop ? '60%' : '80%' },
            isFromCurrentUser
              ? styles.currentUserBubble
              : styles.otherUserBubble,
          ]}
        >
          {!isFromCurrentUser && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isFromCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {item.messageText}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isFromCurrentUser ? styles.currentUserTime : styles.otherUserTime,
            ]}
          >
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name='chatbubbles-outline' size={48} color={theme.colors.textTertiary} />
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>Start the conversation!</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name='warning-outline' size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load messages</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ResponsiveContainer
        maxWidth={{
          mobile: undefined,
          tablet: 768,
          desktop: 1000,
        }}
        padding={{
          mobile: 0,
          tablet: 16,
          desktop: 24,
        }}
        style={styles.container}
      >
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{otherUserName}</Text>
          <Text style={styles.headerSubtitle}>{jobTitle}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => setShowScheduler(true)}
            disabled={VideoCallService.isUserInCall(user?.id || '')}
          >
            <Ionicons
              name='calendar'
              size={20}
              color={VideoCallService.isUserInCall(user?.id || '') ? theme.colors.textTertiary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.videoCallButton}
            onPress={startVideoCall}
            disabled={VideoCallService.isUserInCall(user?.id || '')}
          >
            <Ionicons
              name='videocam'
              size={24}
              color={VideoCallService.isUserInCall(user?.id || '') ? theme.colors.textTertiary : theme.colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name='ellipsis-vertical' size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={
          messages.length === 0 ? styles.emptyList : undefined
        }
        ListEmptyComponent={renderEmpty}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {/* Message Input */}
      <View
        style={[
          styles.inputContainer,
          { paddingBottom: Math.max(insets.bottom, theme.spacing[3]) },
        ]}
      >
        {composerError ? (
          <Banner
            message={composerError}
            variant='error'
            testID='messaging-composer-error'
          />
        ) : null}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={(value) => {
                if (composerError) {
                  setComposerError(null);
                }
                setNewMessage(value);
              }}
            placeholder='Type a message...'
            placeholderTextColor={theme.colors.placeholder}
            multiline
            maxLength={500}
            editable={!sendMessageMutation.isPending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sendMessageMutation.isPending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size='small' color={theme.colors.surface} />
            ) : (
              <Ionicons name='send' size={20} color={theme.colors.surface} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Call Interface Overlay */}
      {isVideoCallActive && activeCallId && (
        <View style={styles.videoCallOverlay}>
          <VideoCallInterface
            callId={activeCallId}
            onCallEnd={handleCallEnd}
            onCallError={handleCallError}
            jobId={jobId}
          />
        </View>
      )}

      {/* Video Call Scheduler Modal */}
      <VideoCallScheduler
        jobId={jobId}
        otherUserId={otherUserId}
        otherUserName={otherUserName}
        isVisible={showScheduler}
        onClose={() => setShowScheduler(false)}
        onScheduled={handleCallScheduled}
      />
        </KeyboardAvoidingView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleButton: {
    padding: 8,
  },
  videoCallButton: {
    padding: 8,
  },
  moreButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
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
    backgroundColor: theme.colors.primary,
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
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherUserTime: {
    color: theme.colors.textTertiary,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing[2],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    maxHeight: 100,
    textAlignVertical: 'center',
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceTertiary,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    color: theme.colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  videoCallOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: theme.colors.background,
  },
});

export default MessagingScreen;
