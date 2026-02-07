import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Message } from '../services/MessagingService';
import VideoCallInterface from '../components/video-call/VideoCallInterface';
import VideoCallScheduler from '../components/video-call/VideoCallScheduler';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import {
  useJobMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useRealTimeMessages,
} from '../hooks/useMessaging';
import { ResponsiveContainer, useResponsive } from '../components/responsive';
import { ChatHeader } from './messaging/components/ChatHeader';
import { MessageBubble } from './messaging/components/MessageBubble';
import { MessageComposer } from './messaging/components/MessageComposer';
import { MessagingLoading, MessagingError, MessagingEmpty } from './messaging/components/MessagingStates';
import { useVideoCall } from './messaging/hooks/useVideoCall';

interface MessagingScreenParams {
  jobId: string;
  jobTitle: string;
  otherUserId: string;
  otherUserName: string;
}

interface Props {
  route: RouteProp<{ params: MessagingScreenParams }>;
  navigation: StackNavigationProp<Record<string, unknown>>;
}

const MessagingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, jobTitle, otherUserId, otherUserName } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();

  const [newMessage, setNewMessage] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const {
    data: messages = [],
    isLoading: loading,
    error,
  } = useJobMessages(jobId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkMessagesAsRead();

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessageAsync = useCallback(async (params: {
    jobId: string;
    receiverId: string;
    messageText: string;
    senderId: string;
    messageType: string;
    callId?: string;
    callDuration?: number;
    scheduledTime?: string;
  }) => {
    await sendMessageMutation.mutateAsync(params);
  }, [sendMessageMutation]);

  const videoCall = useVideoCall({
    jobId,
    otherUserId,
    userId: user?.id,
    userName: user?.first_name,
    sendMessage: sendMessageAsync,
    scrollToEnd,
  });

  useRealTimeMessages(
    jobId,
    (incomingMessage) => {
      scrollToEnd();
      if (incomingMessage.senderId !== user?.id && user?.id) {
        markAsReadMutation.mutate({ jobId, userId: user.id });
      }
    },
    () => {},
    true
  );

  useEffect(() => {
    if (user?.id && messages.length > 0) {
      const hasUnread = messages.some(
        (msg: Message) => !msg.read && msg.receiverId === user.id
      );
      if (hasUnread) {
        markAsReadMutation.mutate({ jobId, userId: user.id });
      }
    }
  }, [messages, user?.id, jobId]);

  const handleSendMessage = async () => {
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
      scrollToEnd();
    } catch (err) {
      logger.error('Error sending message:', err);
      setComposerError('Failed to send message. Please try again.');
      setNewMessage(messageText);
    }
  };

  const handleChangeText = (value: string) => {
    if (composerError) setComposerError(null);
    setNewMessage(value);
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble
      item={item}
      isFromCurrentUser={item.senderId === user?.id}
      isDesktop={isDesktop}
      onCallAccept={videoCall.handleCallAccept}
      onCallDecline={videoCall.handleCallDecline}
    />
  ), [user?.id, isDesktop, videoCall.handleCallAccept, videoCall.handleCallDecline]);

  if (loading) return <MessagingLoading />;
  if (error) return <MessagingError onRetry={() => navigation.goBack()} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ResponsiveContainer
        maxWidth={{ mobile: undefined, tablet: 768, desktop: 1000 }}
        padding={{ mobile: 0, tablet: 16, desktop: 24 }}
        style={styles.container}
      >
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ChatHeader
            otherUserName={otherUserName}
            jobTitle={jobTitle}
            userId={user?.id || ''}
            onGoBack={() => navigation.goBack()}
            onScheduleCall={() => videoCall.setShowScheduler(true)}
            onStartVideoCall={videoCall.startVideoCall}
          />

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.messagesList}
            contentContainerStyle={messages.length === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={MessagingEmpty}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />

          <MessageComposer
            value={newMessage}
            onChangeText={handleChangeText}
            onSend={handleSendMessage}
            isSending={sendMessageMutation.isPending}
            error={composerError}
            bottomInset={insets.bottom}
          />

          {videoCall.isVideoCallActive && videoCall.activeCallId && (
            <View style={styles.videoCallOverlay}>
              <VideoCallInterface
                callId={videoCall.activeCallId}
                onCallEnd={videoCall.handleCallEnd}
                onCallError={videoCall.handleCallError}
                jobId={jobId}
              />
            </View>
          )}

          <VideoCallScheduler
            jobId={jobId}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            isVisible={videoCall.showScheduler}
            onClose={() => videoCall.setShowScheduler(false)}
            onScheduled={videoCall.handleCallScheduled}
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
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  videoCallOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: theme.colors.background,
  },
});

export default MessagingScreen;
