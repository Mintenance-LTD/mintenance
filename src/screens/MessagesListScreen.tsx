import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { useHaptics } from '../utils/haptics';
import { SkeletonMessageCard } from '../components/SkeletonLoader';
import { useMessageThreadsWithRealTime } from '../hooks/useMessaging';

const MessagesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const haptics = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  
  // Get real message threads
  const { data: conversations = [], isLoading: loading, error, refetch } = useMessageThreadsWithRealTime();

  const handleRefresh = async () => {
    setRefreshing(true);
    haptics.pullToRefresh();
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh messages:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const renderSkeletonMessages = () => (
    <View>
      <SkeletonMessageCard />
      <SkeletonMessageCard />
      <SkeletonMessageCard />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        {loading ? (
          renderSkeletonMessages()
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>Failed to load messages</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRefresh}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Start messaging contractors about your projects!</Text>
          </View>
        ) : (
          conversations.map((thread: any) => {
            const otherParticipant = thread.participants.find((p: any) => p.id !== thread.participants[0].id) || thread.participants[0];
            const formatTime = (timestamp: string) => {
              const date = new Date(timestamp);
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              
              if (diffMins < 1) return 'Just now';
              if (diffMins < 60) return `${diffMins}m ago`;
              
              const diffHours = Math.floor(diffMins / 60);
              if (diffHours < 24) return `${diffHours}h ago`;
              
              const diffDays = Math.floor(diffHours / 24);
              return `${diffDays}d ago`;
            };
            
            return (
              <TouchableOpacity 
                key={thread.jobId} 
                style={styles.conversationCard}
                onPress={() => {
                  haptics.buttonPress();
                  // Navigate to individual messaging screen
                  navigation.navigate('Messaging', { 
                    jobId: thread.jobId,
                    jobTitle: thread.jobTitle,
                    otherUserId: otherParticipant.id,
                    otherUserName: otherParticipant.name
                  });
                }}
              >
                <View style={styles.avatarContainer}>
                  <Ionicons name="person-circle" size={50} color={theme.colors.textTertiary} />
                  {thread.unreadCount > 0 && <View style={styles.unreadDot} />}
                </View>
                
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.contractorName}>{otherParticipant.name}</Text>
                    {thread.lastMessage && (
                      <Text style={styles.timestamp}>
                        {formatTime(thread.lastMessage.createdAt)}
                      </Text>
                    )}
                  </View>
                  
                  <Text style={styles.jobType}>{thread.jobTitle}</Text>
                  <Text style={[
                    styles.snippet,
                    thread.unreadCount > 0 && styles.unreadSnippet
                  ]}>
                    {thread.lastMessage?.messageText || 'No messages yet'}
                  </Text>
                  
                  {thread.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>
                        {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary, // Dark blue header
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  searchButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.xxl, // Rounded cards
    marginBottom: 12,
    ...theme.shadows.base,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: theme.colors.secondary, // Green accent
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.textInverse,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  jobType: {
    fontSize: 13,
    color: theme.colors.primary, // Dark blue
    fontWeight: '500',
    marginBottom: 4,
  },
  snippet: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  unreadSnippet: {
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#ef4444',
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
    color: theme.colors.textInverse,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  unreadBadge: {
    position: 'absolute',
    right: 0,
    top: 8,
    backgroundColor: theme.colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MessagesListScreen;
