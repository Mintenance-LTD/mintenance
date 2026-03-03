import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { styles } from './meetingCommunicationPanelStyles';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { MeetingService } from '../services/MeetingService';
import { MessagingService } from '../services/MessagingService';
import {
  ContractorMeeting,
  MeetingUpdate,
  Message,
} from '@mintenance/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { logger } from '../utils/logger';

interface Props {
  meeting: ContractorMeeting;
  onMeetingUpdate: (meeting: ContractorMeeting) => void;
  visible: boolean;
  onClose: () => void;
}

const MeetingCommunicationPanel: React.FC<Props> = ({
  meeting,
  onMeetingUpdate,
  visible,
  onClose,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'chat' | 'schedule'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [updates, setUpdates] = useState<MeetingUpdate[]>([]);
  const [loading, setLoading] = useState(false);

  // Reschedule states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newDate, setNewDate] = useState(new Date());
  const [newTime, setNewTime] = useState(new Date());
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCommunicationData();
    }
  }, [visible, meeting.id]);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);

      // Load job messages
      if (meeting.jobId) {
        const jobMessages = await MessagingService.getJobMessages(meeting.jobId);
        setMessages(jobMessages);
      }

      // Load meeting updates
      const meetingUpdates = await MeetingService.getMeetingUpdates(meeting.id);
      setUpdates(meetingUpdates);
    } catch (error) {
      logger.error('Error loading communication data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !meeting.jobId) return;

    try {
      const otherUserId = user.role === 'homeowner'
        ? meeting.contractorId
        : meeting.homeownerId;

      await MessagingService.sendMessage(
        meeting.jobId,
        user.id,
        otherUserId,
        newMessage.trim(),
        'text'
      );

      setNewMessage('');
      loadCommunicationData(); // Refresh messages
    } catch (error) {
      logger.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rescheduling');
      return;
    }

    try {
      setRescheduleLoading(true);

      const combinedDateTime = new Date(newDate);
      combinedDateTime.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);

      // Check if the new time is in the future
      if (combinedDateTime <= new Date()) {
        Alert.alert('Invalid Time', 'Please select a future date and time');
        return;
      }

      const updatedMeeting = await MeetingService.rescheduleMeeting(
        meeting.id,
        combinedDateTime.toISOString(),
        user?.id || '',
        rescheduleReason.trim()
      );

      onMeetingUpdate(updatedMeeting);
      setRescheduleReason('');
      loadCommunicationData(); // Refresh updates

      Alert.alert(
        'Meeting Rescheduled',
        `Meeting has been rescheduled to ${combinedDateTime.toLocaleString()}`
      );
    } catch (error) {
      logger.error('Error rescheduling meeting:', error);
      Alert.alert('Error', 'Failed to reschedule meeting');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ContractorMeeting['status']) => {
    try {
      const updatedMeeting = await MeetingService.updateMeetingStatus(
        meeting.id,
        newStatus,
        user?.id || ''
      );

      onMeetingUpdate(updatedMeeting);
      loadCommunicationData(); // Refresh updates

      Alert.alert(
        'Status Updated',
        `Meeting status changed to ${newStatus.replace('_', ' ')}`
      );
    } catch (error) {
      logger.error('Error updating meeting status:', error);
      Alert.alert('Error', 'Failed to update meeting status');
    }
  };

  const formatMessageTime = (createdAt: string): string => {
    const date = new Date(createdAt);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const formatUpdateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meeting Communication</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
            onPress={() => setActiveTab('chat')}
          >
            <Ionicons
              name="chatbubbles"
              size={20}
              color={activeTab === 'chat' ? theme.colors.textInverse : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'chat' && styles.activeTabText,
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
            onPress={() => setActiveTab('schedule')}
          >
            <Ionicons
              name="calendar"
              size={20}
              color={activeTab === 'schedule' ? theme.colors.textInverse : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'schedule' && styles.activeTabText,
              ]}
            >
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.info} />
          </View>
        )}

        {!loading && activeTab === 'chat' && (
          <View style={styles.chatContainer}>
            <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
              {messages.map((message) => {
                const isOwnMessage = message.senderId === user?.id;
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageContainer,
                      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                        ]}
                      >
                        {message.messageText}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                        ]}
                      >
                        {formatMessageTime(message.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {messages.length === 0 && (
                <View style={styles.emptyMessages}>
                  <Ionicons name="chatbubbles-outline" size={50} color={theme.colors.textTertiary} />
                  <Text style={styles.emptyMessagesText}>No messages yet</Text>
                  <Text style={styles.emptyMessagesSubtext}>
                    Start a conversation about the meeting
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Message Input */}
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Ionicons name="send" size={20} color={theme.colors.textInverse} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!loading && activeTab === 'schedule' && (
          <View style={styles.scheduleContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Current Meeting Info */}
              <View style={styles.currentMeetingInfo}>
                <Text style={styles.sectionTitle}>Current Meeting</Text>
                <View style={styles.meetingDetails}>
                  <Text style={styles.meetingDateTime}>
                    {new Date(meeting.scheduledDateTime).toLocaleString()}
                  </Text>
                  <Text style={styles.meetingStatus}>
                    Status: {meeting.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Quick Status Actions */}
              {user?.role === 'contractor' && meeting.status === 'scheduled' && (
                <View style={styles.quickActions}>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                  <View style={styles.statusButtons}>
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: theme.colors.success }]}
                      onPress={() => handleStatusChange('confirmed')}
                    >
                      <Ionicons name="checkmark" size={16} color={theme.colors.textInverse} />
                      <Text style={styles.statusButtonText}>Confirm</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: theme.colors.warning }]}
                      onPress={() => handleStatusChange('rescheduled')}
                    >
                      <Ionicons name="calendar" size={16} color={theme.colors.textInverse} />
                      <Text style={styles.statusButtonText}>Needs Reschedule</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Reschedule Section */}
              <View style={styles.rescheduleSection}>
                <Text style={styles.sectionTitle}>Reschedule Meeting</Text>

                {/* Date Selection */}
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.info} />
                  <Text style={styles.dateTimeText}>
                    {newDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>

                {/* Time Selection */}
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={theme.colors.info} />
                  <Text style={styles.dateTimeText}>
                    {newTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>

                {/* Reason Input */}
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Reason for rescheduling..."
                  value={rescheduleReason}
                  onChangeText={setRescheduleReason}
                  multiline
                  maxLength={200}
                />

                {/* Reschedule Button */}
                <TouchableOpacity
                  style={[
                    styles.rescheduleButton,
                    rescheduleLoading && styles.rescheduleButtonDisabled,
                  ]}
                  onPress={handleReschedule}
                  disabled={rescheduleLoading}
                >
                  {rescheduleLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="calendar" size={16} color={theme.colors.textInverse} />
                      <Text style={styles.rescheduleButtonText}>Request Reschedule</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Updates Timeline */}
              {updates.length > 0 && (
                <View style={styles.updatesSection}>
                  <Text style={styles.sectionTitle}>Recent Updates</Text>
                  {updates.map((update) => (
                    <View key={update.id} style={styles.updateItem}>
                      <View style={styles.updateIcon}>
                        <Ionicons
                          name={
                            update.updateType === 'schedule_change'
                              ? 'calendar'
                              : update.updateType === 'status_change'
                              ? 'checkmark-circle'
                              : 'notifications'
                          }
                          size={16}
                          color={theme.colors.info}
                        />
                      </View>
                      <View style={styles.updateContent}>
                        <Text style={styles.updateMessage}>{update.message}</Text>
                        <Text style={styles.updateTime}>
                          {formatUpdateTime(update.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Date/Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={newDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setNewDate(selectedDate);
            }}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={newTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) setNewTime(selectedTime);
            }}
          />
        )}
      </View>
    </Modal>
  );
};


export default MeetingCommunicationPanel;