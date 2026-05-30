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
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// 2026-05-23 audit-15 P2: expo-file-system v19 moved the classic
// directory + encoding helpers under the `/legacy` subpath. Same
// pattern the ContractViewScreen uses for its PDF download fallback.
import {
  documentDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { ScreenHeader } from '../../components/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';
import { logger } from '../../utils/logger';

// 2026-05-23 audit-15 P2: status union now reflects what the live
// `dsr_requests` table actually stores — `pending`, `in_progress`,
// `completed`, `rejected` — plus a synthetic `processing` alias for
// `in_progress` to keep the existing label copy working. Previously
// the API wrote `completed` rows the mobile screen had no case for,
// so they fell through to a default icon and the download UI never
// fired even after the export ran successfully.
interface ExportStatus {
  id: string;
  status:
    | 'pending'
    | 'processing'
    | 'in_progress'
    | 'ready'
    | 'completed'
    | 'expired'
    | 'rejected';
  requestedAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
}

const DATA_CATEGORIES = [
  {
    icon: 'person-outline',
    label: 'Profile information',
    color: '#3B82F6',
    bg: '#DBEAFE',
  },
  {
    icon: 'briefcase-outline',
    label: 'Job history & bids',
    color: me.brand,
    bg: me.brandSoft,
  },
  {
    icon: 'chatbubble-outline',
    label: 'Messages & communications',
    color: '#8B5CF6',
    bg: '#EDE9FE',
  },
  {
    icon: 'card-outline',
    label: 'Payment & invoice records',
    color: me.accent,
    bg: me.warnBg,
  },
  {
    icon: 'star-outline',
    label: 'Reviews & ratings',
    color: '#EC4899',
    bg: '#FCE7F3',
  },
  {
    icon: 'location-outline',
    label: 'Location & property data',
    color: '#6366F1',
    bg: '#EEF2FF',
  },
] as const;

// 2026-05-23 audit-15 P2: `completed` = "Delivered" (file is delivered
// inline in the synchronous POST response, so by the time a row shows
// `completed` the user already has the saved file — surface it as
// Delivered rather than Ready-to-Download to avoid promising a
// re-download we can't honour).
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  pending: { label: 'Queued', color: me.accent, icon: 'time-outline' },
  processing: { label: 'Processing', color: '#3B82F6', icon: 'sync-outline' },
  in_progress: { label: 'Processing', color: me.brand, icon: 'sync-outline' },
  ready: {
    label: 'Ready to Download',
    color: me.brand,
    icon: 'checkmark-circle-outline',
  },
  completed: {
    label: 'Delivered',
    color: me.brand,
    icon: 'checkmark-circle-outline',
  },
  rejected: {
    label: 'Rejected',
    color: me.errFg,
    icon: 'close-circle-outline',
  },
  expired: { label: 'Expired', color: me.ink2, icon: 'alert-circle-outline' },
};

export const DataExportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 2026-05-23 audit: the screen used to read from `data_export_requests`
  // (doesn't exist on live) and POST `{}` to /api/gdpr/export-data
  // (which validates gdprEmailSchema and rejects empty body). The
  // canonical live table is `dsr_requests`, and the GDPR portability
  // request type is filtered with request_type='portability'. The
  // download URL lives in `data_export_path`. Fixed both ends so
  // the screen actually lists prior requests + submits valid ones.
  const { data: exports, isLoading } = useQuery<ExportStatus[]>({
    queryKey: ['data-exports', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('dsr_requests')
        .select('id, status, requested_at, completed_at, data_export_path')
        .eq('user_id', user.id)
        .eq('request_type', 'portability')
        .order('requested_at', { ascending: false });
      if (error) return [];
      return (data || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        status: ((d.status as string) || 'pending') as ExportStatus['status'],
        requestedAt: d.requested_at as string,
        completedAt: d.completed_at as string | null,
        downloadUrl: d.data_export_path as string | null,
      }));
    },
    enabled: !!user?.id,
  });

  const requestMutation = useMutation({
    mutationFn: async (): Promise<{ savedPath: string | null }> => {
      if (!user?.email) {
        throw new Error('Missing account email');
      }
      // Server validates that {email} matches the authenticated
      // user's account email — guards against the case where a
      // user proxies a request for someone else's data.
      //
      // 2026-05-23 audit-15 P2: /api/gdpr/export-data is a SYNCHRONOUS
      // export — it runs export_user_data RPC, marks the DSR row
      // `completed`, and returns the full data payload inline. There's
      // no later download step, so the only way to deliver the export
      // to the user is to consume `data` from this response and save
      // it locally on the device.
      const response = await mobileApiClient.post<{
        message?: string;
        request_id?: string;
        data?: Record<string, unknown>;
      }>('/api/gdpr/export-data', { email: user.email });

      let savedPath: string | null = null;
      if (response?.data) {
        try {
          // documentDirectory survives app restarts (cacheDirectory may
          // be cleared by the OS). The file name carries the date so
          // multiple exports don't collide.
          const dateStamp = new Date().toISOString().split('T')[0];
          const fileName = `mintenance-data-export-${dateStamp}.json`;
          const base = documentDirectory ?? '';
          if (base) {
            const target = base + fileName;
            await writeAsStringAsync(
              target,
              JSON.stringify(response.data, null, 2),
              { encoding: EncodingType.UTF8 }
            );
            savedPath = target;
          }
        } catch (err) {
          // File-write failure shouldn't lose the export — fall through
          // to the in-memory alert below so the user at least knows
          // their export ran. Log for diagnostic correlation.
          logger.warn('Failed to write data export to disk', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return { savedPath };
    },
    onSuccess: ({ savedPath }) => {
      queryClient.invalidateQueries({ queryKey: ['data-exports'] });
      if (savedPath) {
        Alert.alert(
          'Export Saved',
          `Your data export has been saved to your device. Tap "Open" to view it now, or find it later in the Files app.`,
          [
            { text: 'Done', style: 'default' },
            {
              text: 'Open',
              onPress: () => {
                Linking.openURL(savedPath).catch(() => {
                  Alert.alert(
                    'File saved',
                    `Saved to: ${savedPath}\n\nUse the Files app to open it.`
                  );
                });
              },
            },
          ]
        );
      } else {
        // The server returned no payload (shouldn't happen for the
        // happy path — log + tell the user). They can re-request.
        Alert.alert(
          'Export Generated',
          'Your data export was generated, but the file could not be saved on this device. Please try again or use the web app to download it.'
        );
      }
    },
    onError: () =>
      Alert.alert('Error', 'Failed to request data export. Please try again.'),
  });

  const handleRequest = () => {
    Alert.alert(
      'Request Data Export',
      'We will prepare a complete export of all your personal data. This may take up to 48 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Export', onPress: () => requestMutation.mutate() },
      ]
    );
  };

  // 2026-05-23 audit-15 P2: live DSR rows use `in_progress` (not the
  // legacy `processing` alias). Block re-requests while either label
  // is in flight, but DO let the user re-request after a `completed`
  // run (delivered inline) or a `rejected` run.
  const hasPendingExport = exports?.some(
    (e) =>
      e.status === 'pending' ||
      e.status === 'processing' ||
      e.status === 'in_progress'
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='Export My Data'
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.iconChip, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name='download-outline' size={18} color='#3B82F6' />
            </View>
            <Text style={styles.title}>Your Data, Your Right</Text>
          </View>
          <Text style={styles.bodyText}>
            Under GDPR, you have the right to receive a copy of all personal
            data we hold about you in a portable format.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Included Data</Text>
        <View style={styles.card}>
          {DATA_CATEGORIES.map((cat, i) => (
            <View
              key={cat.label}
              style={[
                styles.catRow,
                i < DATA_CATEGORIES.length - 1 && styles.catBorder,
              ]}
            >
              <View style={[styles.iconChip, { backgroundColor: cat.bg }]}>
                <Ionicons
                  name={cat.icon as 'person-outline'}
                  size={16}
                  color={cat.color}
                />
              </View>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </View>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator
            size='small'
            color={me.ink}
            style={{ marginTop: 16 }}
          />
        ) : exports && exports.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Previous Exports</Text>
            <View style={styles.card}>
              {exports.map((exp, i) => {
                const cfg = STATUS_CONFIG[exp.status] ?? {
                  icon: 'help-circle',
                  color: '#9CA3AF',
                  label: exp.status,
                };
                return (
                  <View
                    key={exp.id}
                    style={[
                      styles.exportRow,
                      i < exports.length - 1 && styles.catBorder,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exportDate}>
                        {new Date(exp.requestedAt).toLocaleDateString()}
                      </Text>
                      <View style={styles.statusRow}>
                        <Ionicons
                          name={cfg.icon as 'time-outline'}
                          size={13}
                          color={cfg.color}
                        />
                        <Text style={[styles.statusText, { color: cfg.color }]}>
                          {cfg.label}
                        </Text>
                      </View>
                    </View>
                    {exp.status === 'ready' && (
                      <Ionicons
                        name='cloud-download-outline'
                        size={20}
                        color={me.brand}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[
            styles.button,
            (hasPendingExport || requestMutation.isPending) &&
              styles.buttonDisabled,
          ]}
          onPress={handleRequest}
          disabled={hasPendingExport || requestMutation.isPending}
          activeOpacity={0.8}
        >
          {requestMutation.isPending ? (
            <ActivityIndicator size='small' color={me.onBrand} />
          ) : (
            <>
              <Ionicons name='download-outline' size={18} color={me.onBrand} />
              <Text style={styles.buttonText}>
                {hasPendingExport
                  ? 'Export In Progress'
                  : 'Request Data Export'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Exports are generated as a JSON file and saved to your device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...me.shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingBottom: 8,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: me.ink },
  bodyText: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  catBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  catLabel: {
    fontSize: 14,
    color: me.ink,
    fontWeight: '400',
  },
  exportRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  exportDate: {
    fontSize: 14,
    fontWeight: '500',
    color: me.ink,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  statusText: { fontSize: 12, fontWeight: '500' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: me.ink,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 8,
    marginBottom: 12,
  },
  buttonDisabled: { backgroundColor: me.ink3 },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.onBrand,
  },
  footnote: {
    fontSize: 12,
    color: me.ink3,
    lineHeight: 18,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
