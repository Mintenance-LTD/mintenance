import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MessagingStackParamList } from '../navigation/types';
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
import { supabase } from '../config/supabase';

interface MessagingScreenParams {
  jobId: string;
  jobTitle: string;
  otherUserId: string;
  otherUserName: string;
}

interface Props {
  route: RouteProp<{ params: MessagingScreenParams }>;
  navigation: NativeStackNavigationProp<MessagingStackParamList, 'Messaging'>;
}

const MessagingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, jobTitle, otherUserId, otherUserName } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();

  const [newMessage, setNewMessage] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingBroadcastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Typing indicator — subscribe to realtime broadcast for this conversation
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`typing:${jobId}`);
    channel
      .on('broadcast', { event: 'typing' }, (payload: { payload?: { userId?: string } }) => {
        if (payload.payload?.userId !== user.id) {
          setIsOtherUserTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherUserTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingBroadcastRef.current) clearTimeout(typingBroadcastRef.current);
      supabase.removeChannel(channel);
    };
  }, [jobId, user?.id]);

  const broadcastTyping = useCallback(() => {
    if (!user?.id) return;
    if (typingBroadcastRef.current) return; // Debounce: only send once every 2s

    typingBroadcastRef.current = setTimeout(() => {
      typingBroadcastRef.current = null;
    }, 2000);

    supabase.channel(`typing:${jobId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id },
    }).catch(() => { /* ignore realtime errors */ });
  }, [jobId, user?.id]);

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
    if (value.length > 0) broadcastTyping();
  };

  const handleAttach = useCallback(async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const path = `messages/${jobId}/${Date.now()}.${ext}`;

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(path, blob, { contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('job-photos')
        .getPublicUrl(path);

      await sendMessageMutation.mutateAsync({
        jobId,
        receiverId: otherUserId,
        messageText: '',
        senderId: user.id,
        messageType: 'image',
        attachmentUrl: urlData.publicUrl,
      });
      scrollToEnd();
    } catch (err) {
      logger.error('Failed to send image', err);
      setComposerError('Failed to send image. Please try again.');
    }
  }, [user, jobId, otherUserId, sendMessageMutation, scrollToEnd]);

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

          {isOtherUserTyping && (
            <View style={styles.typingRow}>
              <Text style={styles.typingText}>{otherUserName} is typing…</Text>
            </View>
          )}

          <MessageComposer
            value={newMessage}
            onChangeText={handleChangeText}
            onSend={handleSendMessage}
            onAttach={handleAttach}
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
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
  },
  typingText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  videoCallOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: theme.colors.background,
  },
});

export default MessagingScreen;

