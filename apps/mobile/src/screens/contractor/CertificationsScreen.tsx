import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';

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

const getExpiryStatus = (expiryDate: string): { label: string; variant: 'success' | 'warning' | 'danger' } => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 86400));
  if (daysUntil < 0) return { label: 'Expired', variant: 'danger' };
  if (daysUntil < 30) return { label: 'Expiring Soon', variant: 'warning' };
  return { label: 'Active', variant: 'success' };
};

export const CertificationsScreen: React.FC = () => {
  const navigation = useNavigation();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-certifications'],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ certifications: Certification[] }>('/api/contractor/certifications');
      return res.certifications || [];
    },
  });

  const certifications = data || [];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Certifications" showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={certifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState icon="ribbon-outline" title="No Certifications" subtitle="Add your professional certifications." />}
        renderItem={({ item }) => {
          const status = getExpiryStatus(item.expiry_date);
          return (
            <View style={styles.certRow}>
              <View style={styles.certHeader}>
                <View style={styles.certInfo}>
                  <Text style={styles.certName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.certIssuer}>{item.issuer}</Text>
                </View>
                <View style={styles.certBadges}>
                  <Badge variant={status.variant} size="sm">{status.label}</Badge>
                  {item.verified && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  )}
                </View>
              </View>
              <View style={styles.certMeta}>
                <Text style={styles.certDate}>
                  Issued: {new Date(item.issue_date).toLocaleDateString('en-GB')}
                </Text>
                <Text style={styles.certDate}>
                  Expires: {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                </Text>
              </View>
              {item.credential_id && (
                <Text style={styles.credentialId}>ID: {item.credential_id}</Text>
              )}
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCertification' as never)}
        accessibilityLabel="Add certification"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16, paddingBottom: 80 },
  certRow: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, ...theme.shadows.sm },
  certHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  certInfo: { flex: 1, marginRight: 12 },
  certName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  certIssuer: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  certBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  certMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  certDate: { fontSize: 12, color: theme.colors.textTertiary },
  credentialId: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 6 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
});

export default CertificationsScreen;
