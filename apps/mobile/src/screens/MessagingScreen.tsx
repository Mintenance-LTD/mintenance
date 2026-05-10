/**
 * MessagingScreen — Redesigned chat with green bubbles, date separators,
 * animated typing indicator, and contextual empty state.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MessagingStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { Message } from '../services/MessagingService';
// AUDIT_PUNCH_LIST P1 #23 (B-P1-2) — VideoCallInterface (live WebRTC
// overlay) used to be imported here but gated behind a dead
// `LIVE_VIDEO_CALLS_ENABLED = false` flag. Importing it pulled the
// WebRTC bundle into every messaging session even though it never
// rendered. Removed 2026-05-09. Re-add when live calls actually
// ship — the scheduling overlay below stays since it's still used.
import VideoCallScheduler from '../components/video-call/VideoCallScheduler';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import {
  useJobMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useRealTimeMessages,
} from '../hooks/useMessaging';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { ResponsiveContainer, useResponsive } from '../components/responsive';
import { ChatHeader } from './messaging/components/ChatHeader';
import { MessageBubble } from './messaging/components/MessageBubble';
import { MessageComposer } from './messaging/components/MessageComposer';
import {
  MessagingLoading,
  MessagingError,
  MessagingEmpty,
} from './messaging/components/MessagingStates';
import { useVideoCall } from './messaging/hooks/useVideoCall';
import { getDateKey, getDateLabel } from './messaging/utils';
import { supabase } from '../config/supabase';
import { mobileApiClient } from '../utils/mobileApiClient';
import { styles } from './MessagingScreen/styles';
import { TypingIndicator } from './MessagingScreen/TypingIndicator';
import { QuickQuoteModal } from './MessagingScreen/QuickQuoteModal';

interface Props {
  route: RouteProp<MessagingStackParamList, 'Messaging'>;
  navigation: NativeStackNavigationProp<MessagingStackParamList, 'Messaging'>;
}

const MessagingScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    conversationId: jobId,
    jobTitle = '',
    recipientId: otherUserId = '',
    recipientName: otherUserName = '',
  } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();

  const [newMessage, setNewMessage] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteSending, setQuoteSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingBroadcastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );

  const {
    data: rawMessages,
    isLoading: loading,
    error,
  } = useJobMessages(jobId);
  const messages = (Array.isArray(rawMessages) ? rawMessages : []) as Message[];
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkMessagesAsRead();
  const queryClient = useQueryClient();

  // Build a set of indices that should show a date separator
  const dateSeparators = useMemo(() => {
    const map = new Map<number, string>();
    let lastDateKey = '';
    messages.forEach((msg, index) => {
      const key = getDateKey(msg.createdAt);
      if (key !== lastDateKey) {
        map.set(index, getDateLabel(msg.createdAt));
        lastDateKey = key;
      }
    });
    return map;
  }, [messages]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    });
  }, []);

  const sendMessageAsync = useCallback(
    async (params: {
      jobId: string;
      receiverId: string;
      messageText: string;
      senderId: string;
      messageType: string;
      callId?: string;
      callDuration?: number;
      scheduledTime?: string;
    }) => {
      const {
        callId: _callId,
        callDuration: _callDuration,
        scheduledTime: _scheduledTime,
        messageType,
        ...rest
      } = params;
      await sendMessageMutation.mutateAsync({
        ...rest,
        messageType: (messageType as 'text' | 'image' | 'file') || 'text',
      });
    },
    [sendMessageMutation]
  );

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

  // Typing indicator — subscribe to realtime broadcast
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`typing:${jobId}`);
    typingChannelRef.current = channel;
    channel
      .on(
        'broadcast',
        { event: 'typing' },
        (payload: { payload?: { userId?: string } }) => {
          if (payload.payload?.userId !== user.id) {
            setIsOtherUserTyping(true);
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(
              () => setIsOtherUserTyping(false),
              3000
            );
          }
        }
      )
      .subscribe();

    return () => {
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingBroadcastRef.current) clearTimeout(typingBroadcastRef.current);
      supabase.removeChannel(channel);
    };
  }, [jobId, user?.id]);

  const broadcastTyping = useCallback(() => {
    if (!user?.id) return;
    if (typingBroadcastRef.current) return;
    // Use the already-subscribed channel ref; skip if not yet ready.
    if (!typingChannelRef.current) return;

    typingBroadcastRef.current = setTimeout(() => {
      typingBroadcastRef.current = null;
    }, 2000);

    typingChannelRef.current
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id },
      })
      .catch((err: unknown) => {
        logger.error(
          'Failed to broadcast typing event to realtime channel',
          err
        );
      });
  }, [user?.id]);

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

  const markMessageFailed = useCallback(
    (tempId: string) => {
      queryClient.setQueryData(
        queryKeys.messages.conversation(jobId),
        (oldData: Message[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((msg) =>
            msg.id === tempId
              ? { ...msg, deliveryStatus: 'failed' as const }
              : msg
          );
        }
      );
    },
    [jobId, queryClient]
  );

  const handleSendMessage = async (text?: string) => {
    const messageText = (text ?? newMessage).trim();
    if (!messageText || !user || sendMessageMutation.isPending) return;

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
      const currentMessages: Message[] | undefined = queryClient.getQueryData(
        queryKeys.messages.conversation(jobId)
      );
      const failedMsg = currentMessages?.find(
        (m) =>
          m.id.startsWith('temp_message_') &&
          m.senderId === user.id &&
          m.messageText === messageText
      );
      if (failedMsg) {
        markMessageFailed(failedMsg.id);
      } else {
        setComposerError('Failed to send message. Please try again.');
        setNewMessage(messageText);
      }
    }
  };

  const handleRetryMessage = useCallback(
    async (failedMessage: Message) => {
      if (!user) return;

      queryClient.setQueryData(
        queryKeys.messages.conversation(jobId),
        (oldData: Message[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter((msg) => msg.id !== failedMessage.id);
        }
      );

      try {
        await sendMessageMutation.mutateAsync({
          jobId,
          receiverId: otherUserId,
          messageText: failedMessage.messageText,
          senderId: user.id,
          messageType:
            (failedMessage.messageType as 'text' | 'image' | 'file') || 'text',
          attachmentUrl: failedMessage.attachmentUrl,
        });
        scrollToEnd();
      } catch (err) {
        logger.error('Retry failed:', err);
        const currentMessages: Message[] | undefined = queryClient.getQueryData(
          queryKeys.messages.conversation(jobId)
        );
        const retryMsg = currentMessages?.find(
          (m) =>
            m.id.startsWith('temp_message_') &&
            m.messageText === failedMessage.messageText
        );
        if (retryMsg) {
          markMessageFailed(retryMsg.id);
        }
      }
    },
    [
      user,
      jobId,
      otherUserId,
      sendMessageMutation,
      scrollToEnd,
      queryClient,
      markMessageFailed,
    ]
  );

  const handleChangeText = (value: string) => {
    if (composerError) setComposerError(null);
    setNewMessage(value);
    if (value.length > 0) broadcastTyping();
  };

  const handleAttach = useCallback(async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo access to attach images.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';

    try {
      const formData = new FormData();
      formData.append('photos', {
        uri: asset.uri,
        name: `${Date.now()}.${ext}`,
        type: `image/${ext}`,
      } as unknown as Blob);
      formData.append('job_id', jobId);

      const uploadResponse = await mobileApiClient.postFormData<{
        urls?: string[];
        url?: string;
        public_url?: string;
      }>('/api/jobs/upload-photos', formData);

      const imageUrl =
        uploadResponse.urls?.[0] ??
        uploadResponse.public_url ??
        uploadResponse.url;

      await sendMessageMutation.mutateAsync({
        jobId,
        receiverId: otherUserId,
        messageText: '',
        senderId: user.id,
        messageType: 'image',
        attachmentUrl: imageUrl,
      });
      scrollToEnd();
    } catch (err) {
      logger.error('Failed to send image', err);
      setComposerError('Failed to send image. Please try again.');
    }
  }, [user, jobId, otherUserId, sendMessageMutation, scrollToEnd]);

  const handleQuickQuoteSend = useCallback(async () => {
    if (!user || !quoteAmount.trim()) return;
    const amount = parseFloat(quoteAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid quote amount.');
      return;
    }
    setQuoteSending(true);
    try {
      // Insert quote via API
      await mobileApiClient.post('/api/contractor/quotes', {
        job_id: jobId,
        client_name: otherUserName,
        total_amount: amount,
        status: 'sent',
        notes: quoteDescription.trim() || null,
      });

      // Send a message with the quote details
      const quoteMsg = `💰 Quote sent: £${amount.toFixed(2)}${quoteDescription.trim() ? `\n${quoteDescription.trim()}` : ''}`;
      await sendMessageMutation.mutateAsync({
        jobId,
        receiverId: otherUserId,
        messageText: quoteMsg,
        senderId: user.id,
        messageType: 'text',
      });
      scrollToEnd();
      setShowQuoteModal(false);
      setQuoteAmount('');
      setQuoteDescription('');
    } catch (err) {
      logger.error('Failed to send quick quote', err);
      Alert.alert('Error', 'Failed to send quote. Please try again.');
    } finally {
      setQuoteSending(false);
    }
  }, [
    user,
    quoteAmount,
    quoteDescription,
    jobId,
    otherUserId,
    otherUserName,
    sendMessageMutation,
    scrollToEnd,
  ]);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble
        item={item}
        isFromCurrentUser={item.senderId === user?.id}
        isDesktop={isDesktop}
        onCallAccept={videoCall.handleCallAccept}
        onCallDecline={videoCall.handleCallDecline}
        onRetry={handleRetryMessage}
        showDateSeparator={dateSeparators.get(index)}
      />
    ),
    [
      user?.id,
      isDesktop,
      videoCall.handleCallAccept,
      videoCall.handleCallDecline,
      handleRetryMessage,
      dateSeparators,
    ]
  );

  if (loading) return <MessagingLoading />;
  if (error) return <MessagingError onRetry={() => navigation.goBack()} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ResponsiveContainer
        maxWidth={{ mobile: undefined, tablet: 768, desktop: 1000 }}
        padding={{ mobile: 0, tablet: 16, desktop: 24 }}
        style={styles.responsiveContainer}
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
            jobId={jobId}
            onGoBack={() => navigation.goBack()}
            // 2026-04-30 audit P1: video call backend is unbuilt
            // (call_participants table doesn't exist in live schema —
            // see audit P0-1 disposition for CallManager.ts).
            // Replace the live-call CTA with a "coming soon" alert
            // instead of letting the user trigger a broken flow.
            // VideoCallScheduler still works because it writes to
            // `video_calls` (which exists) for async scheduling, so
            // we keep onScheduleCall live.
            onScheduleCall={() => videoCall.setShowScheduler(true)}
            onStartVideoCall={() =>
              Alert.alert(
                'Video calls coming soon',
                'Live video calls aren’t available yet. Tap the calendar icon to schedule a call instead.'
              )
            }
            onViewJobDetails={() => {
              navigation.getParent?.()?.navigate('JobsTab', {
                screen: 'JobDetails',
                params: { jobId },
              });
            }}
            onSendQuote={
              user?.role === 'contractor'
                ? () => setShowQuoteModal(true)
                : undefined
            }
          />

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 && styles.emptyList,
            ]}
            ListEmptyComponent={
              <MessagingEmpty
                jobTitle={jobTitle}
                onQuickMessage={(text) => handleSendMessage(text)}
              />
            }
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />

          {isOtherUserTyping && (
            <TypingIndicator otherUserName={otherUserName} />
          )}

          <MessageComposer
            value={newMessage}
            onChangeText={handleChangeText}
            onSend={() => handleSendMessage()}
            onAttach={handleAttach}
            isSending={sendMessageMutation.isPending}
            error={composerError}
            bottomInset={insets.bottom}
          />

          {/* Live WebRTC overlay deleted 2026-05-09 — see import block. */}

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

      <QuickQuoteModal
        visible={showQuoteModal}
        otherUserName={otherUserName}
        jobTitle={jobTitle}
        quoteAmount={quoteAmount}
        quoteDescription={quoteDescription}
        quoteSending={quoteSending}
        onChangeAmount={setQuoteAmount}
        onChangeDescription={setQuoteDescription}
        onClose={() => setShowQuoteModal(false)}
        onSend={handleQuickQuoteSend}
        onOpenFullQuote={() => {
          setShowQuoteModal(false);
          (
            navigation as {
              navigate: (
                screen: string,
                params?: Record<string, unknown>
              ) => void;
            }
          ).navigate('CreateQuote', { jobId });
        }}
      />
    </View>
  );
};

export default MessagingScreen;
