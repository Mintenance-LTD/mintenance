import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
}

export const TeamScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-team', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rows, error: err } = await supabase
        .from('contractor_team_members')
        .select('*')
        .eq('contractor_id', user.id)
        .order('name', { ascending: true });
      if (err) throw new Error(err.message);
      return (rows || []).map((m: Record<string, unknown>): TeamMember => ({
        id: m.id as string,
        name: m.name as string || '',
        role: m.role as string || '',
        phone: m.phone as string || '',
        email: m.email as string || '',
        avatar_url: m.avatar_url as string | undefined,
        status: (m.status as TeamMember['status']) || 'active',
      }));
    },
    enabled: !!user?.id,
  });

  const members = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView message="Failed to load team" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.backgroundSecondary} />
      <ScreenHeader title="Team" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No Team Members" subtitle="Add team members to manage your crew." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.role}>{item.role}</Text>
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.phone}>{item.phone}</Text>
              </View>
            </View>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#059669' : theme.colors.textTertiary }]} />
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTeamMember' as never)}
        accessibilityLabel="Add team member"
      >
        <Ionicons name="person-add" size={24} color={theme.colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  role: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phone: { fontSize: 12, color: theme.colors.textSecondary },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
});

export default TeamScreen;
