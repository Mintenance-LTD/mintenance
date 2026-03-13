/**
 * MessagingScreen — Redesigned chat with green bubbles, date separators,
 * animated typing indicator, and contextual empty state.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MessagingStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { Message } from '../services/MessagingService';
import VideoCallInterface from '../components/video-call/VideoCallInterface';
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
import { MessagingLoading, MessagingError, MessagingEmpty } from './messaging/components/MessagingStates';
import { useVideoCall } from './messaging/hooks/useVideoCall';
import { getDateKey, getDateLabel } from './messaging/utils';
import { supabase } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';

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

  const {
    data: rawMessages,
    isLoading: loading,
    error,
  } = useJobMessages(jobId);
  const messages = (rawMessages ?? []) as Message[];
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
    const { callId: _callId, callDuration: _callDuration, scheduledTime: _scheduledTime, messageType, ...rest } = params;
    await sendMessageMutation.mutateAsync({
      ...rest,
      messageType: (messageType as 'text' | 'image' | 'file') || 'text',
    });
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

  // Typing indicator — subscribe to realtime broadcast
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
    if (typingBroadcastRef.current) return;

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

  const markMessageFailed = useCallback((tempId: string) => {
    queryClient.setQueryData(
      queryKeys.messages.conversation(jobId),
      (oldData: Message[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((msg) =>
          msg.id === tempId ? { ...msg, deliveryStatus: 'failed' as const } : msg
        );
      }
    );
  }, [jobId, queryClient]);

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
        (m) => m.id.startsWith('temp_message_') && m.senderId === user.id && m.messageText === messageText
      );
      if (failedMsg) {
        markMessageFailed(failedMsg.id);
      } else {
        setComposerError('Failed to send message. Please try again.');
        setNewMessage(messageText);
      }
    }
  };

  const handleRetryMessage = useCallback(async (failedMessage: Message) => {
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
        messageType: (failedMessage.messageType as 'text' | 'image' | 'file') || 'text',
        attachmentUrl: failedMessage.attachmentUrl,
      });
      scrollToEnd();
    } catch (err) {
      logger.error('Retry failed:', err);
      const currentMessages: Message[] | undefined = queryClient.getQueryData(
        queryKeys.messages.conversation(jobId)
      );
      const retryMsg = currentMessages?.find(
        (m) => m.id.startsWith('temp_message_') && m.messageText === failedMessage.messageText
      );
      if (retryMsg) {
        markMessageFailed(retryMsg.id);
      }
    }
  }, [user, jobId, otherUserId, sendMessageMutation, scrollToEnd, queryClient, markMessageFailed]);

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

  const handleQuickQuoteSend = useCallback(async () => {
    if (!user || !quoteAmount.trim()) return;
    const amount = parseFloat(quoteAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid quote amount.');
      return;
    }
    setQuoteSending(true);
    try {
      // Insert quote into quotes table
      const { error: quoteError } = await supabase.from('quotes').insert({
        contractor_id: user.id,
        job_id: jobId,
        client_name: otherUserName,
        total_amount: amount,
        status: 'sent',
        notes: quoteDescription.trim() || null,
      });
      if (quoteError) throw quoteError;

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
  }, [user, quoteAmount, quoteDescription, jobId, otherUserId, otherUserName, sendMessageMutation, scrollToEnd]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => (
    <MessageBubble
      item={item}
      isFromCurrentUser={item.senderId === user?.id}
      isDesktop={isDesktop}
      onCallAccept={videoCall.handleCallAccept}
      onCallDecline={videoCall.handleCallDecline}
      onRetry={handleRetryMessage}
      showDateSeparator={dateSeparators.get(index)}
    />
  ), [user?.id, isDesktop, videoCall.handleCallAccept, videoCall.handleCallDecline, handleRetryMessage, dateSeparators]);

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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ChatHeader
            otherUserName={otherUserName}
            jobTitle={jobTitle}
            userId={user?.id || ''}
            jobId={jobId}
            onGoBack={() => navigation.goBack()}
            onScheduleCall={() => videoCall.setShowScheduler(true)}
            onStartVideoCall={videoCall.startVideoCall}
            onViewJobDetails={() => {
              navigation.getParent?.()?.navigate('JobsTab', {
                screen: 'JobDetails',
                params: { jobId },
              });
            }}
            onSendQuote={() => setShowQuoteModal(true)}
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

          {/* Typing indicator — animated dots bubble */}
          {isOtherUserTyping && (
            <View style={styles.typingRow}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
                <Text style={styles.typingName}>{otherUserName}</Text>
              </View>
            </View>
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

      {/* Quick Quote Modal */}
      <Modal
        visible={showQuoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuoteModal(false)}
      >
        <View style={styles.quoteOverlay}>
          <View style={styles.quoteCard}>
            {/* Handle bar */}
            <View style={styles.quoteHandle} />

            <View style={styles.quoteHeader}>
              <View style={styles.quoteIconWrap}>
                <Ionicons name="pricetag" size={18} color="#222222" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quoteTitle}>Send Quote</Text>
                <Text style={styles.quoteSubtitle}>to {otherUserName}</Text>
              </View>
              <TouchableOpacity
                style={styles.quoteCloseBtn}
                onPress={() => setShowQuoteModal(false)}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color="#717171" />
              </TouchableOpacity>
            </View>

            {jobTitle ? (
              <View style={styles.quoteJobPill}>
                <Ionicons name="briefcase-outline" size={14} color="#717171" />
                <Text style={styles.quoteJobText} numberOfLines={1}>{jobTitle}</Text>
              </View>
            ) : null}

            {/* Amount input */}
            <Text style={styles.quoteLabel}>Quote Amount</Text>
            <View style={styles.quoteAmountRow}>
              <Text style={styles.quoteCurrency}>£</Text>
              <TextInput
                style={styles.quoteAmountInput}
                value={quoteAmount}
                onChangeText={setQuoteAmount}
                placeholder="0.00"
                placeholderTextColor="#B0B0B0"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {/* Description input */}
            <Text style={styles.quoteLabel}>Description (optional)</Text>
            <TextInput
              style={styles.quoteDescInput}
              value={quoteDescription}
              onChangeText={setQuoteDescription}
              placeholder="e.g. Full bathroom renovation including materials"
              placeholderTextColor="#B0B0B0"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Actions */}
            <View style={styles.quoteActions}>
              <TouchableOpacity
                style={styles.quoteFullBtn}
                onPress={() => {
                  setShowQuoteModal(false);
                  navigation.getParent?.()?.navigate('ProfileTab', {
                    screen: 'QuoteBuilder',
                  });
                }}
              >
                <Ionicons name="document-text-outline" size={16} color="#222222" />
                <Text style={styles.quoteFullBtnText}>Full Quote</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quoteSendBtn, (!quoteAmount.trim() || quoteSending) && styles.quoteSendBtnDisabled]}
                onPress={handleQuickQuoteSend}
                disabled={!quoteAmount.trim() || quoteSending}
              >
                {quoteSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.quoteSendBtnText}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  responsiveContainer: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Typing indicator
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#B0B0B0',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  typingName: {
    fontSize: 12,
    color: '#B0B0B0',
    fontStyle: 'italic',
  },

  videoCallOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#F7F7F7',
  },

  // Quick Quote Modal
  quoteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  quoteHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EBEBEB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  quoteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
  },
  quoteSubtitle: {
    fontSize: 13,
    color: '#717171',
    marginTop: 1,
  },
  quoteCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteJobPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F7F7F7',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 18,
  },
  quoteJobText: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '500',
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#717171',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quoteAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  quoteCurrency: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    marginRight: 4,
  },
  quoteAmountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    paddingVertical: 14,
  },
  quoteDescInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: '#222222',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    minHeight: 80,
    marginBottom: 20,
  },
  quoteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quoteFullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#222222',
  },
  quoteFullBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  quoteSendBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#222222',
  },
  quoteSendBtnDisabled: {
    opacity: 0.4,
  },
  quoteSendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default MessagingScreen;
