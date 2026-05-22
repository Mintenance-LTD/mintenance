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
import { logger } from '../utils/logger';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useHaptics } from '../utils/haptics';
import { SkeletonMessageCard } from '../components/SkeletonLoader';
import { Banner } from '../components/ui/Banner';
import { useMessageThreadsWithRealTime } from '../hooks/useMessaging';
import type { MessageThread } from '../services/MessagingService';
import type { MessagingStackParamList } from '../navigation/types';
import { me } from '../design-system/mint-editorial';

const AVATAR_COLORS = [
  '#222222',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
];

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? '#222222';
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const MessagesListScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MessagingStackParamList>>();
  const { user } = useAuth();
  const haptics = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: rawConversations = [],
    isLoading: loading,
    error,
    refetch,
  } = useMessageThreadsWithRealTime();
  const conversations = rawConversations as MessageThread[];

  const filteredConversations = useMemo(() => {
    // Sort by most recent message first
    const sorted = [...conversations].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;
      return bTime - aTime;
    });

    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((thread) => {
      const other =
        thread.participants.find((p) => p.id !== user?.id) ||
        thread.participants[0];
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
        {/* Editorial v2: eyebrow + serif headline pattern. */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.searchButton}
            accessibilityRole='button'
            accessibilityLabel='Search conversations'
            onPress={() => {
              setIsSearching((prev) => !prev);
              setSearchQuery('');
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSearching ? 'close-outline' : 'search-outline'}
              size={20}
              color={me.ink}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.screenHeader}>
          <Text style={styles.eyebrow}>Conversations</Text>
          <Text style={styles.headline} accessibilityRole='header'>
            Messages
          </Text>
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
                color={me.onBrand}
                style={styles.retryIcon}
              />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.jobId}
            contentContainerStyle={[
              styles.content,
              conversations.length === 0 && styles.emptyContainer,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={me.brand}
                colors={[me.brand]}
                progressBackgroundColor={me.surface}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons
                    name='chatbubbles-outline'
                    size={32}
                    color={me.ink2}
                    accessible={false}
                  />
                </View>
                <Text style={styles.emptyText}>No conversations yet</Text>
                <Text style={styles.emptySubtext}>
                  Start messaging contractors about your projects!
                </Text>
              </View>
            }
            renderItem={({ item: thread }) => {
              const otherParticipant =
                thread.participants.find((p) => p.id !== user?.id) ??
                thread.participants[0];
              if (!otherParticipant) return null;
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
                      conversationId: thread.jobId,
                      jobTitle: thread.jobTitle,
                      recipientId: otherParticipant.id,
                      recipientName: otherParticipant.name,
                    });
                  }}
                  activeOpacity={0.7}
                  accessibilityRole='button'
                  accessibilityLabel={`Conversation with ${otherParticipant.name} about ${thread.jobTitle}${thread.unreadCount > 0 ? `, ${thread.unreadCount} unread messages` : ''}`}
                  accessibilityHint='Double tap to open conversation'
                >
                  <View style={styles.avatarContainer}>
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor: getAvatarColor(
                            otherParticipant.name
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.avatarInitials}>
                        {getInitials(otherParticipant.name)}
                      </Text>
                    </View>
                    {thread.unreadCount > 0 && (
                      <View style={styles.unreadDot} />
                    )}
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
                      numberOfLines={1}
                    >
                      {thread.lastMessage?.messageText ||
                        'Start the conversation'}
                    </Text>

                    {thread.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>
                          {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Ionicons name='chevron-forward' size={14} color={me.ink3} />
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
    backgroundColor: me.surface,
  },
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  // Editorial v2 top bar + serif headline (2026-05-22).
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  screenHeader: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: me.surface,
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: me.surface,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: me.onBrand,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: me.brand,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: me.surface,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contractorName: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  timestamp: {
    fontSize: 12,
    color: me.ink3,
  },
  jobType: {
    fontSize: 12,
    color: me.ink2,
    fontWeight: '500',
    marginBottom: 2,
  },
  snippet: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
  unreadSnippet: {
    fontWeight: '600',
    color: me.ink,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: me.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryIcon: {
    marginRight: 6,
  },
  retryText: {
    color: me.onBrand,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: me.ink,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  unreadBadge: {
    position: 'absolute',
    right: 0,
    top: 8,
    backgroundColor: me.brand,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: me.onBrand,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default MessagesListScreen;
