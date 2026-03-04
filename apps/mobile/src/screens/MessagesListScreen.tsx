import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import SearchBar from '../components/SearchBar';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useHaptics } from '../utils/haptics';
import { SkeletonMessageCard } from '../components/SkeletonLoader';
import { Banner } from '../components/ui/Banner';
import { useMessageThreadsWithRealTime } from '../hooks/useMessaging';

const AVATAR_COLORS = ['#222222', '#444444', '#555555', '#717171', '#888888', '#999999'];

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const MessagesListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const haptics = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get real message threads
  const {
    data: conversations = [],
    isLoading: loading,
    error,
    refetch,
  } = useMessageThreadsWithRealTime();

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((thread: { participants: Array<{ id: string; name: string }>; jobTitle?: string; lastMessage?: { messageText?: string } }) => {
      const other = thread.participants.find((p) => p.id !== user?.id) || thread.participants[0];
      return (
        other?.name?.toLowerCase().includes(q) ||
        thread.jobTitle?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    haptics.pullToRefresh();
    try {
      await refetch();
    } catch (error) {
      logger.error('Failed to refresh messages', error);
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole='header'>Messages</Text>
        <TouchableOpacity
          style={styles.searchButton}
          accessibilityRole='button'
          accessibilityLabel='Search conversations'
          onPress={() => {
            setIsSearching((prev) => !prev);
            setSearchQuery('');
          }}
        >
          <Ionicons
            name={isSearching ? 'close-outline' : 'search-outline'}
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      {isSearching && (
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder='Search by name or job...'
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Messages List */}
      {loading ? (
        <View style={styles.content}>{renderSkeletonMessages()}</View>
      ) : error ? (
        <View style={[styles.content, styles.errorContainer]}>
          <Banner
            message='Failed to load messages'
            variant='error'
            testID='messages-error-banner'
          />
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            accessibilityRole='button'
            accessibilityLabel='Retry loading messages'
          >
            <Ionicons
              name='refresh'
              size={18}
              color={theme.colors.textInverse}
              style={styles.retryIcon}
            />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item: unknown) => item.jobId}
          contentContainerStyle={[
            styles.content,
            conversations.length === 0 && styles.emptyContainer,
          ]}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name='chatbubbles-outline' size={48} color={theme.colors.textTertiary} accessible={false} />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Start messaging contractors about your projects!
              </Text>
            </View>
          }
          renderItem={({ item: thread }) => {
            const otherParticipant =
              thread.participants.find(
                (p: unknown) => p.id !== user?.id
              ) || thread.participants[0];
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
                style={styles.conversationCard}
                onPress={() => {
                  haptics.buttonPress();
                  navigation.navigate('Messaging', {
                    jobId: thread.jobId,
                    jobTitle: thread.jobTitle,
                    otherUserId: otherParticipant.id,
                    otherUserName: otherParticipant.name,
                  });
                }}
                accessibilityRole='button'
                accessibilityLabel={`Conversation with ${otherParticipant.name} about ${thread.jobTitle}${thread.unreadCount > 0 ? `, ${thread.unreadCount} unread messages` : ''}`}
                accessibilityHint='Double tap to open conversation'
              >
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(otherParticipant.name) }]}>
                    <Text style={styles.avatarInitials}>
                      {getInitials(otherParticipant.name)}
                    </Text>
                  </View>
                  {thread.unreadCount > 0 && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.contractorName}>
                      {otherParticipant.name}
                    </Text>
                    {thread.lastMessage && (
                      <Text style={styles.timestamp}>
                        {formatTime(thread.lastMessage.createdAt)}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.jobType}>{thread.jobTitle}</Text>
                  <Text
                    style={[
                      styles.snippet,
                      thread.unreadCount > 0 && styles.unreadSnippet,
                    ]}
                  >
                    {thread.lastMessage?.messageText || 'Start the conversation'}
                  </Text>

                  {thread.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>
                        {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                <Ionicons
                  name='chevron-forward'
                  size={16}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    backgroundColor: '#222222',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors.background,
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
    color: theme.colors.textSecondary,
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
  },  retryButton: {
    backgroundColor: '#222222',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryIcon: {
    marginRight: theme.spacing[1],
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
    backgroundColor: '#222222',
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
