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
import { theme } from '../../theme';
import { useToast } from '../../components/ui/Toast';
import type { ProfileStackParamList, RootTabParamList } from '../../navigation/types';

interface ClientDetailScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ClientDetail'>;
  route: RouteProp<ProfileStackParamList, 'ClientDetail'>;
}

export const ClientDetailScreen: React.FC<ClientDetailScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const tabNavigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { client } = route.params;

  const handleCall = async () => {
    if (!client.phone) {
      toast.error('No phone number', 'This client has no phone number on record.');
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
    tabNavigation.navigate('MessagingTab', {
      screen: 'Messaging',
      params: {
        conversationId: client.client_id,
        recipientId: client.client_id,
        recipientName: `${client.first_name} ${client.last_name}`.trim(),
      },
    } as never);
  };

  const STATUS_COLORS: Record<string, string> = {
    active: theme.colors.success,
    prospect: theme.colors.info,
    inactive: theme.colors.textSecondary,
    former: theme.colors.textTertiary,
  };
  const statusColor = STATUS_COLORS[client.relationship_status as string] ?? theme.colors.textSecondary;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
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
              {client.first_name.charAt(0)}{client.last_name.charAt(0)}
            </Text>
          </View>
          <Text style={styles.clientName}>
            {client.first_name} {client.last_name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{client.relationship_status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
            <Ionicons name="call" size={22} color='#717171' />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleEmail}>
            <Ionicons name="mail" size={22} color='#717171' />
            <Text style={styles.actionBtnText}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble" size={22} color='#717171' />
            <Text style={styles.actionBtnText}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color={theme.colors.textTertiary} />
            <Text style={styles.detailText}>{client.email}</Text>
          </View>
          {client.phone ? (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color={theme.colors.textTertiary} />
              <Text style={styles.detailText}>{client.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{client.total_jobs}</Text>
              <Text style={styles.statLabel}>Jobs</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>£{client.total_revenue?.toLocaleString() || '0'}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {client.satisfaction_score?.toFixed(1) || '—'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
          {client.last_job_date ? (
            <View style={[styles.detailRow, { marginTop: 8 }]}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textTertiary} />
              <Text style={styles.detailText}>
                Last job: {new Date(client.last_job_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, textAlign: 'center' },
  scroll: { flex: 1 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    ...theme.shadows.base,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: theme.colors.textInverse },
  clientName: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  statusText: { fontSize: 11, fontWeight: '700', color: theme.colors.textInverse },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.sm,
  },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionBtnText: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: '600' },
  section: {
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.sm,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  detailText: { fontSize: 14, color: theme.colors.textPrimary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});

export default ClientDetailScreen;
