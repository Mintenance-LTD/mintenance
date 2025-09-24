import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { MutualConnectionsService } from '../services/MutualConnectionsService';
import { ConnectionRequest, MutualConnection } from '../types';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import { useHaptics } from '../utils/haptics';

const ConnectionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const haptics = useHaptics();
  const [activeTab, setActiveTab] = useState<'requests' | 'connections'>('requests');
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [mutualConnections, setMutualConnections] = useState<MutualConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [requests, connections] = await Promise.all([
        MutualConnectionsService.getConnectionRequests(user.id),
        MutualConnectionsService.getMutualConnections(user.id),
      ]);

      setConnectionRequests(requests);
      setMutualConnections(connections);
    } catch (error) {
      logger.error('Error loading connections data:', error);
      Alert.alert('Error', 'Failed to load connections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (connectionId: string) => {
    try {
      haptics.light();
      await MutualConnectionsService.acceptConnectionRequest(connectionId);
      Alert.alert('Success', 'Connection request accepted!');
      loadData(); // Refresh data
    } catch (error) {
      logger.error('Error accepting connection request:', error);
      Alert.alert('Error', 'Failed to accept connection request. Please try again.');
    }
  };

  const handleRejectRequest = async (connectionId: string) => {
    try {
      haptics.light();
      await MutualConnectionsService.rejectConnectionRequest(connectionId);
      Alert.alert('Success', 'Connection request rejected.');
      loadData(); // Refresh data
    } catch (error) {
      logger.error('Error rejecting connection request:', error);
      Alert.alert('Error', 'Failed to reject connection request. Please try again.');
    }
  };

  const handleMessageConnection = (connection: MutualConnection) => {
    haptics.buttonPress();
    const otherUser = connection.requesterId === user?.id ? connection.receiver : connection.requester;
    if (otherUser) {
      navigation.navigate('Messaging', {
        jobId: 'connection-chat',
        jobTitle: 'Connection Chat',
        otherUserId: otherUser.id,
        otherUserName: `${otherUser.firstName} ${otherUser.lastName}`,
      });
    }
  };

  const renderConnectionRequest = (request: ConnectionRequest) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.userInfo}>
          {request.requester.profileImageUrl ? (
            <Image
              source={{ uri: request.requester.profileImageUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {request.requester.firstName?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {request.requester.firstName} {request.requester.lastName}
            </Text>
            <View style={styles.roleContainer}>
              <Ionicons
                name={request.requester.role === 'contractor' ? 'construct' : 'home'}
                size={14}
                color={theme.colors.secondary}
              />
              <Text style={styles.userRole}>
                {request.requester.role === 'contractor' ? 'Contractor' : 'Homeowner'}
              </Text>
            </View>
            {request.message && (
              <Text style={styles.requestMessage}>{request.message}</Text>
            )}
          </View>
        </View>
        <Text style={styles.requestTime}>
          {new Date(request.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(request.id)}
        >
          <Ionicons name="close" size={16} color={theme.colors.error} />
          <Text style={styles.rejectButtonText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(request.id)}
        >
          <Ionicons name="checkmark" size={16} color={theme.colors.textInverse} />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMutualConnection = (connection: MutualConnection) => {
    const otherUser = connection.requesterId === user?.id ? connection.receiver : connection.requester;
    if (!otherUser) return null;

    return (
      <View key={connection.id} style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <View style={styles.userInfo}>
            {otherUser.profileImageUrl ? (
              <Image
                source={{ uri: otherUser.profileImageUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {otherUser.firstName?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {otherUser.firstName} {otherUser.lastName}
              </Text>
              <View style={styles.roleContainer}>
                <Ionicons
                  name={otherUser.role === 'contractor' ? 'construct' : 'home'}
                  size={14}
                  color={theme.colors.secondary}
                />
                <Text style={styles.userRole}>
                  {otherUser.role === 'contractor' ? 'Contractor' : 'Homeowner'}
                </Text>
              </View>
              {otherUser.bio && (
                <Text style={styles.userBio} numberOfLines={2}>
                  {otherUser.bio}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.connectionTime}>
            Connected {new Date(connection.acceptedAt || connection.requestedAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.connectionActions}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => handleMessageConnection(connection)}
          >
            <Ionicons name="chatbubble" size={16} color={theme.colors.primary} />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = (type: 'requests' | 'connections') => (
    <View style={styles.emptyState}>
      <Ionicons
        name={type === 'requests' ? 'person-add-outline' : 'people-outline'}
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>
        {type === 'requests' ? 'No Connection Requests' : 'No Mutual Connections'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {type === 'requests'
          ? 'When someone sends you a connection request, it will appear here.'
          : 'Start connecting with contractors and homeowners to build your network!'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Connections</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({connectionRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'connections' && styles.activeTab]}
          onPress={() => setActiveTab('connections')}
        >
          <Text style={[styles.tabText, activeTab === 'connections' && styles.activeTabText]}>
            Connected ({mutualConnections.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'requests' ? (
          <>
            {connectionRequests.length > 0 ? (
              connectionRequests.map(renderConnectionRequest)
            ) : (
              renderEmptyState('requests')
            )}
          </>
        ) : (
          <>
            {mutualConnections.length > 0 ? (
              mutualConnections.map(renderMutualConnection)
            ) : (
              renderEmptyState('connections')
            )}
          </>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: theme.colors.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  requestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.base,
  },
  connectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.base,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userRole: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  userBio: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  requestTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginLeft: 8,
  },
  connectionTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginLeft: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  connectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  acceptButton: {
    backgroundColor: theme.colors.secondary,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ConnectionsScreen;