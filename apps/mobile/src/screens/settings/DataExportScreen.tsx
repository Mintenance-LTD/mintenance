/**
 * Data Export Screen (GDPR Compliance)
 *
 * Allows users to request a full export of their personal data
 * in compliance with GDPR Article 20 (Right to Data Portability).
 *
 * @filesize Target: <200 lines
 */

import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Platform, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '../../components/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

interface ExportStatus {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'expired';
  requestedAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
}

const DATA_CATEGORIES = [
  { icon: 'person-outline', label: 'Profile information', color: '#3B82F6', bg: '#DBEAFE' },
  { icon: 'briefcase-outline', label: 'Job history & bids', color: theme.colors.primary, bg: theme.colors.primaryLight },
  { icon: 'chatbubble-outline', label: 'Messages & communications', color: '#8B5CF6', bg: '#EDE9FE' },
  { icon: 'card-outline', label: 'Payment & invoice records', color: theme.colors.accent, bg: theme.colors.accentLight },
  { icon: 'star-outline', label: 'Reviews & ratings', color: '#EC4899', bg: '#FCE7F3' },
  { icon: 'location-outline', label: 'Location & property data', color: '#6366F1', bg: '#EEF2FF' },
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Queued', color: theme.colors.accent, icon: 'time-outline' },
  processing: { label: 'Processing', color: '#3B82F6', icon: 'sync-outline' },
  ready: { label: 'Ready to Download', color: theme.colors.primary, icon: 'checkmark-circle-outline' },
  expired: { label: 'Expired', color: theme.colors.textSecondary, icon: 'alert-circle-outline' },
};

export const DataExportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: exports, isLoading } = useQuery<ExportStatus[]>({
    queryKey: ['data-exports', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_export_requests')
        .select('id, status, requested_at:created_at, completed_at, download_url')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        status: d.status as ExportStatus['status'],
        requestedAt: d.requested_at as string,
        completedAt: d.completed_at as string | null,
        downloadUrl: d.download_url as string | null,
      }));
    },
    enabled: !!user?.id,
  });

  const requestMutation = useMutation({
    mutationFn: () => mobileApiClient.post('/api/gdpr/export-data', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-exports'] });
      Alert.alert('Request Submitted', 'Your data export is being prepared. You will be notified when it is ready.');
    },
    onError: () => Alert.alert('Error', 'Failed to request data export. Please try again.'),
  });

  const handleRequest = () => {
    Alert.alert(
      'Request Data Export',
      'We will prepare a complete export of all your personal data. This may take up to 48 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Export', onPress: () => requestMutation.mutate() },
      ],
    );
  };

  const hasPendingExport = exports?.some((e) => e.status === 'pending' || e.status === 'processing');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.backgroundSecondary} />
      <ScreenHeader title="Export My Data" showBack onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.iconChip, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="download-outline" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.title}>Your Data, Your Right</Text>
          </View>
          <Text style={styles.bodyText}>
            Under GDPR, you have the right to receive a copy of all personal data we hold about you in a portable format.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Included Data</Text>
        <View style={styles.card}>
          {DATA_CATEGORIES.map((cat, i) => (
            <View key={cat.label} style={[styles.catRow, i < DATA_CATEGORIES.length - 1 && styles.catBorder]}>
              <View style={[styles.iconChip, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon as 'person-outline'} size={16} color={cat.color} />
              </View>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </View>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.textPrimary} style={{ marginTop: 16 }} />
        ) : exports && exports.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Previous Exports</Text>
            <View style={styles.card}>
              {exports.map((exp, i) => {
                const cfg = STATUS_CONFIG[exp.status];
                return (
                  <View key={exp.id} style={[styles.exportRow, i < exports.length - 1 && styles.catBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exportDate}>{new Date(exp.requestedAt).toLocaleDateString()}</Text>
                      <View style={styles.statusRow}>
                        <Ionicons name={cfg.icon as 'time-outline'} size={13} color={cfg.color} />
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    {exp.status === 'ready' && (
                      <Ionicons name="cloud-download-outline" size={20} color={theme.colors.primary} />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.button, (hasPendingExport || requestMutation.isPending) && styles.buttonDisabled]}
          onPress={handleRequest}
          disabled={hasPendingExport || requestMutation.isPending}
          activeOpacity={0.8}
        >
          {requestMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color={theme.colors.textInverse} />
              <Text style={styles.buttonText}>
                {hasPendingExport ? 'Export In Progress' : 'Request Data Export'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Exports are delivered as a ZIP file containing JSON data. Download links expire after 7 days.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: 16, marginBottom: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 8 },
  iconChip: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  bodyText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  catBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  catLabel: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '400' },
  exportRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  exportDate: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  statusText: { fontSize: 12, fontWeight: '500' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.textPrimary, borderRadius: 12, paddingVertical: 15, marginTop: 8, marginBottom: 12,
  },
  buttonDisabled: { backgroundColor: theme.colors.textTertiary },
  buttonText: { fontSize: 15, fontWeight: '600', color: theme.colors.textInverse },
  footnote: { fontSize: 12, color: theme.colors.textTertiary, lineHeight: 18, paddingHorizontal: 4, textAlign: 'center' },
});

export default DataExportScreen;
