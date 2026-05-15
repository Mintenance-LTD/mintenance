import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileNavigation } from '../../navigation/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  credential_id?: string;
  category: string;
  verified: boolean;
}

const getExpiryStatus = (
  expiryDate: string
): { label: string; variant: 'success' | 'warning' | 'error' } => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntil = Math.floor(
    (expiry.getTime() - now.getTime()) / (1000 * 86400)
  );
  if (daysUntil < 0) return { label: 'Expired', variant: 'error' };
  if (daysUntil < 30) return { label: 'Expiring Soon', variant: 'warning' };
  return { label: 'Active', variant: 'success' };
};

export const CertificationsScreen: React.FC = () => {
  const navigation = useProfileNavigation();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-certifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rows, error: err } = await supabase
        .from('contractor_certifications')
        .select('*')
        .eq('contractor_id', user.id)
        .order('issue_date', { ascending: false });
      if (err) throw new Error(err.message);
      return (rows || []).map(
        (c: Record<string, unknown>): Certification => ({
          id: c.id as string,
          name: (c.name as string) || '',
          issuer: (c.issuer as string) || '',
          issue_date: c.issue_date as string,
          expiry_date: c.expiry_date as string,
          credential_id: c.credential_id as string | undefined,
          category: (c.category as string) || 'general',
          verified: (c.verified as boolean) ?? false,
        })
      );
    },
    enabled: !!user?.id,
  });

  const certifications = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorView message='Failed to load certifications' onRetry={refetch} />
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='Certifications'
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={certifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={me.ink}
            colors={[me.ink]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon='ribbon-outline'
            title='No Certifications'
            subtitle='Add your professional certifications.'
          />
        }
        renderItem={({ item }) => {
          const status = getExpiryStatus(item.expiry_date);
          return (
            <View style={styles.certRow}>
              <View style={styles.certHeader}>
                <View style={styles.certInfo}>
                  <Text style={styles.certName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.certIssuer}>{item.issuer}</Text>
                </View>
                <View style={styles.certBadges}>
                  <Badge variant={status.variant} size='sm'>
                    {status.label}
                  </Badge>
                  {item.verified && (
                    <Ionicons
                      name='checkmark-circle'
                      size={18}
                      color={me.brand}
                    />
                  )}
                </View>
              </View>
              <View style={styles.certMeta}>
                <Text style={styles.certDate}>
                  Issued:{' '}
                  {new Date(item.issue_date).toLocaleDateString('en-GB')}
                </Text>
                <Text style={styles.certDate}>
                  Expires:{' '}
                  {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                </Text>
              </View>
              {item.credential_id && (
                <Text style={styles.credentialId}>
                  ID: {item.credential_id}
                </Text>
              )}
            </View>
          );
        }}
      />

      {/* DBS Check entry point */}
      <TouchableOpacity
        style={styles.dbsButton}
        onPress={() => navigation.navigate('DBSCheck')}
        accessibilityRole='button'
      >
        <Ionicons name='shield-checkmark-outline' size={18} color={me.brand} />
        <Text style={styles.dbsButtonText}>DBS Background Check</Text>
        <Ionicons name='chevron-forward' size={16} color={me.ink3} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCertification')}
        accessibilityLabel='Add certification'
      >
        <Ionicons name='add' size={28} color={me.onBrand} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  list: { padding: 16, paddingBottom: 80 },
  certRow: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...me.shadow.card,
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  certInfo: { flex: 1, marginRight: 12 },
  certName: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
  },
  certIssuer: { fontSize: 13, color: me.ink2, marginTop: 2 },
  certBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  certMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  certDate: { fontSize: 12, color: me.ink3 },
  credentialId: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 6,
  },
  dbsButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 80,
    padding: 14,
    backgroundColor: me.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: me.line,
  },
  dbsButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: me.ink,
  },
  fab: {
    position: 'absolute' as const,
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: me.brand,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...me.shadow.pop,
  },
});
