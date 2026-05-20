import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useToast } from '../../components/ui/Toast';
import type {
  ProfileStackParamList,
  RootTabParamList,
} from '../../navigation/types';
import { goToMessagingThread } from '../../navigation/hooks';
import { me } from '../../design-system/mint-editorial';

interface ClientData {
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  relationship_status: string;
  total_jobs: number;
  total_revenue?: number;
  satisfaction_score?: number;
  last_job_date?: string;
}

interface ClientDetailScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ClientDetail'>;
  route: RouteProp<ProfileStackParamList, 'ClientDetail'>;
}

const STATUS_COLORS: Record<string, string> = {
  active: me.brand,
  prospect: '#3B82F6',
  inactive: me.ink2,
  former: me.ink3,
};

export const ClientDetailScreen: React.FC<ClientDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { client: rawClient } = route.params;
  const client = rawClient as unknown as ClientData;

  const handleCall = async () => {
    if (!client.phone) {
      toast.error(
        'No phone number',
        'This client has no phone number on record.'
      );
      return;
    }
    const url = `tel:${client.phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot make phone call');
    }
  };

  const handleEmail = async () => {
    const url = `mailto:${client.email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open email client');
    }
  };

  const handleMessage = () => {
    // 2026-04-30 audit P1: typed cross-stack helper replaces `as never`.
    goToMessagingThread(tabNavigation, {
      conversationId: client.client_id,
      recipientId: client.client_id,
      recipientName: `${client.first_name} ${client.last_name}`.trim(),
    });
  };

  const statusColor =
    STATUS_COLORS[client.relationship_status as string] ?? me.ink2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {client.first_name} {client.last_name}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {client.first_name.charAt(0)}
              {client.last_name.charAt(0)}
            </Text>
          </View>
          <Text style={styles.clientName}>
            {client.first_name} {client.last_name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {client.relationship_status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          {[
            {
              icon: 'call' as const,
              label: 'Call',
              onPress: handleCall,
              bg: me.brandSoft,
              color: me.brand,
            },
            {
              icon: 'mail' as const,
              label: 'Email',
              onPress: handleEmail,
              bg: '#DBEAFE',
              color: '#3B82F6',
            },
            {
              icon: 'chatbubble' as const,
              label: 'Message',
              onPress: handleMessage,
              bg: '#EDE9FE',
              color: '#8B5CF6',
            },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionBtn}
              onPress={action.onPress}
            >
              <View
                style={[styles.actionIconWrap, { backgroundColor: action.bg }]}
              >
                <Ionicons name={action.icon} size={20} color={action.color} />
              </View>
              <Text style={styles.actionBtnText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACT</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Ionicons name='mail-outline' size={14} color={me.ink2} />
            </View>
            <Text style={styles.detailText}>{client.email}</Text>
          </View>
          {client.phone ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name='call-outline' size={14} color={me.ink2} />
              </View>
              <Text style={styles.detailText}>{client.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HISTORY</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{client.total_jobs}</Text>
              <Text style={styles.statLabel}>Jobs</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {'\u00A3'}
                {client.total_revenue?.toLocaleString() || '0'}
              </Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {client.satisfaction_score?.toFixed(1) || '\u2014'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
          {client.last_job_date ? (
            <View style={[styles.detailRow, { marginTop: 12 }]}>
              <View style={styles.detailIconWrap}>
                <Ionicons name='time-outline' size={14} color={me.ink2} />
              </View>
              <Text style={styles.detailText}>
                Last job:{' '}
                {new Date(client.last_job_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
    ...me.shadow.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: me.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: me.onBrand,
  },
  clientName: {
    fontSize: 20,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 8,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.onBrand,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    ...me.shadow.card,
  },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    color: me.ink,
    fontWeight: '600',
  },
  section: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { fontSize: 14, color: me.ink },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: me.ink,
  },
  statLabel: { fontSize: 12, color: me.ink2, marginTop: 2 },
});
