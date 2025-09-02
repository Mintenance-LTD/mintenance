import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { useHaptics } from '../utils/haptics';
import { SkeletonMessageCard } from '../components/SkeletonLoader';

const MessagesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const haptics = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Simulate initial loading
  React.useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, []);
  
  const conversations = [
    {
      id: 1,
      contractorName: "Mike Johnson",
      jobType: "Kitchen Repair",
      snippet: "I can start the job next Monday morning",
      timestamp: "2m ago",
      unread: true,
      avatar: null,
    },
    {
      id: 2,
      contractorName: "Sarah Williams",
      jobType: "Bathroom Renovation", 
      snippet: "The materials have been ordered",
      timestamp: "1h ago",
      unread: false,
      avatar: null,
    },
    {
      id: 3,
      contractorName: "David Chen",
      jobType: "Plumbing Fix",
      snippet: "Job completed successfully!",
      timestamp: "3h ago",
      unread: false,
      avatar: null,
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    haptics.pullToRefresh();
    // Simulate loading messages
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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
          <Ionicons name="search-outline" size={24} color="#fff" />
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
        ) : (
          conversations.map((conversation) => (
          <TouchableOpacity 
            key={conversation.id} 
            style={styles.conversationCard}
            onPress={() => {
              haptics.buttonPress();
              // Navigate to individual messaging screen
              // navigation.navigate('Messaging', { 
              //   jobId: conversation.id.toString(),
              //   jobTitle: conversation.jobType,
              //   otherUserId: 'user_id',
              //   otherUserName: conversation.contractorName
              // });
            }}
          >
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={50} color={theme.colors.textTertiary} />
              {conversation.unread && <View style={styles.unreadDot} />}
            </View>
            
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text style={styles.contractorName}>{conversation.contractorName}</Text>
                <Text style={styles.timestamp}>{conversation.timestamp}</Text>
              </View>
              
              <Text style={styles.jobType}>{conversation.jobType}</Text>
              <Text style={[
                styles.snippet,
                conversation.unread && styles.unreadSnippet
              ]}>
                {conversation.snippet}
              </Text>
            </View>
            
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          ))
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
    color: '#fff',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20, // Rounded cards
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
    borderColor: '#fff',
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
});

export default MessagesListScreen;