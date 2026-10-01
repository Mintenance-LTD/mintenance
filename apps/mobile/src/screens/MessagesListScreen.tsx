import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { styles } from './messagesListStyles';
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

const AVATAR_COLORS = [me.brand, me.ink2, me.ink3];

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
  const [filter, setFilter] = useState<'Recent' | 'Unread' | 'Older' | 'All'>(
    'Recent'
  );

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

    const visible = sorted.filter((thread) => {
      // Search always includes retained history. Unread conversations stay visible.
      if (searchQuery.trim() || filter === 'All') return true;
      if (filter === 'Unread') return thread.unreadCount > 0;
      const time = Date.parse(thread.lastMessage?.createdAt ?? '');
      const older = Number.isFinite(time) && time < Date.now() - 90 * 86400000;
      return filter === 'Older' ? older : !older || thread.unreadCount > 0;
    });
    if (!searchQuery.trim()) return visible;
    const q = searchQuery.toLowerCase();
    return visible.filter((thread) => {
      const other =
        thread.participants.find((p) => p.id !== user?.id) ||
        thread.participants[0];
      return (
        other?.name?.toLowerCase().includes(q) ||
        thread.jobTitle?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, user?.id, filter]);

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

        <View style={styles.filters}>
          {(['Recent', 'Unread', 'Older', 'All'] as const).map((value) => (
            <TouchableOpacity
              key={value}
              accessibilityRole='button'
              accessibilityState={{ selected: filter === value }}
              onPress={() => setFilter(value)}
              style={[styles.filter, filter === value && styles.selectedFilter]}
            >
              <Text
                style={{
                  color: filter === value ? me.onBrand : me.ink2,
                  fontWeight: '600',
                }}
              >
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.filterHelp}>
          {searchQuery.trim()
            ? 'Searching all conversation history.'
            : 'Older keeps conversations inactive for 90 days. Nothing is deleted.'}
        </Text>
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
                <Text style={styles.emptyText}>
                  {conversations.length
                    ? 'No matching conversations'
                    : 'No conversations yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  Choose All or search by name or job to find retained
                  conversations.
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
                if (diffDays < 7) return `${diffDays}d ago`;
                return date.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  ...(date.getFullYear() !== now.getFullYear()
                    ? { year: 'numeric' as const }
                    : {}),
                });
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
                      <Text style={styles.contractorName} numberOfLines={1}>
                        {otherParticipant.name}
                      </Text>
                    </View>

                    <Text style={styles.jobType} numberOfLines={1}>
                      {thread.jobTitle}
                    </Text>
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
                  </View>
                  <View style={styles.metadata}>
                    {thread.lastMessage && (
                      <Text style={styles.timestamp}>
                        {formatTime(thread.lastMessage.createdAt)}
                      </Text>
                    )}
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

export default MessagesListScreen;
