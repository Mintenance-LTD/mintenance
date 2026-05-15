/**
 * DBSCheckScreen — Contractor DBS (Disclosure and Barring Service) check
 *
 * Shows current check status and allows initiating a new check.
 * Mirrors web at /contractor/certifications (DBSCheckSection).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';

type DBSType = 'basic' | 'standard' | 'enhanced';

interface DBSStatus {
  hasCheck: boolean;
  check?: {
    status: string;
    dbsType?: string;
    certificateNumber?: string;
    expiryDate?: string;
    boostPercentage?: number;
  };
}

const DBS_TYPES: Array<{
  value: DBSType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    value: 'basic',
    label: 'Basic',
    description: 'Unspent convictions and conditional cautions',
    icon: 'shield-outline',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Spent + unspent convictions, cautions, reprimands, warnings',
    icon: 'shield-checkmark-outline',
  },
  {
    value: 'enhanced',
    label: 'Enhanced',
    description: 'Standard + local police information',
    icon: 'shield',
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Pending', color: '#D97706', bg: '#FEF3C7' },
  in_progress: { label: 'In Progress', color: '#2563EB', bg: '#DBEAFE' },
  completed: {
    label: 'Verified',
    color: me.brand2,
    bg: me.brandSoft,
  },
  failed: { label: 'Failed', color: me.errFg, bg: me.errBg },
  expired: { label: 'Expired', color: me.errFg, bg: me.errBg },
};

export const DBSCheckScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<DBSType>('basic');

  const {
    data: dbsStatus,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dbs-check', user?.id],
    queryFn: async () => {
      return await mobileApiClient.get<DBSStatus>('/api/contractor/dbs-check');
    },
    enabled: !!user?.id,
  });

  const initiateMutation = useMutation({
    mutationFn: async (dbsType: DBSType) => {
      return await mobileApiClient.post('/api/contractor/dbs-check', {
        dbsType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbs-check'] });
      Alert.alert(
        'DBS Check Initiated',
        'Your DBS check has been submitted. You will be notified when it is complete. This typically takes 2-5 working days.',
        [{ text: 'OK' }]
      );
    },
    onError: (err: unknown) => {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to initiate DBS check.'
      );
    },
  });

  const handleInitiate = () => {
    Alert.alert(
      'Start DBS Check',
      `Initiate a ${selectedType} DBS check? This will verify your criminal record status and add a trust badge to your profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Check',
          onPress: () => initiateMutation.mutate(selectedType),
        },
      ]
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return <ErrorView message='Failed to load DBS status' onRetry={refetch} />;

  const check = dbsStatus?.check;
  const statusConfig = check?.status
    ? STATUS_CONFIG[check.status] || STATUS_CONFIG.pending
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='DBS Check'
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name='shield-checkmark' size={24} color={me.brand} />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>
              Build Trust with Homeowners
            </Text>
            <Text style={styles.infoBannerText}>
              A verified DBS check shows homeowners you are safe and
              trustworthy. Contractors with DBS checks get up to 40% more job
              enquiries.
            </Text>
          </View>
        </View>

        {/* Current status */}
        {check && statusConfig && (
          <View style={styles.statusCard}>
            <Text style={styles.sectionLabel}>Current Status</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig.bg },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: statusConfig.color }]}
                >
                  {statusConfig.label}
                </Text>
              </View>
              {check.dbsType && (
                <Text style={styles.dbsTypeText}>
                  {check.dbsType.charAt(0).toUpperCase() +
                    check.dbsType.slice(1)}{' '}
                  Check
                </Text>
              )}
            </View>
            {check.certificateNumber && (
              <Text style={styles.certNumber}>
                Certificate: {check.certificateNumber}
              </Text>
            )}
            {check.expiryDate && (
              <Text style={styles.expiryText}>
                Expires:{' '}
                {new Date(check.expiryDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            )}
            {check.boostPercentage && check.boostPercentage > 0 && (
              <View style={styles.boostRow}>
                <Ionicons name='trending-up' size={16} color={me.brand} />
                <Text style={styles.boostText}>
                  +{check.boostPercentage}% profile visibility boost
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Initiate new check */}
        {(!check ||
          check.status === 'expired' ||
          check.status === 'failed') && (
          <>
            <Text style={styles.sectionLabel}>Select Check Type</Text>
            {DBS_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  selectedType === type.value && styles.typeCardSelected,
                ]}
                onPress={() => setSelectedType(type.value)}
                accessibilityRole='radio'
                accessibilityState={{ selected: selectedType === type.value }}
              >
                <View style={styles.typeCardHeader}>
                  <Ionicons
                    name={type.icon}
                    size={22}
                    color={selectedType === type.value ? me.brand : me.ink2}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      selectedType === type.value && styles.typeLabelSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {selectedType === type.value && (
                    <Ionicons
                      name='checkmark-circle'
                      size={20}
                      color={me.brand}
                    />
                  )}
                </View>
                <Text style={styles.typeDescription}>{type.description}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.initiateButton,
                initiateMutation.isPending && { opacity: 0.5 },
              ]}
              onPress={handleInitiate}
              disabled={initiateMutation.isPending}
              accessibilityRole='button'
            >
              <Ionicons name='shield-checkmark' size={20} color={me.onBrand} />
              <Text style={styles.initiateButtonText}>
                {initiateMutation.isPending
                  ? 'Submitting...'
                  : 'Start DBS Check'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  content: { padding: 16, paddingBottom: 32 },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: me.brandSoft,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  infoBannerContent: { flex: 1 },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: me.brand2,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...me.shadow.card,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  dbsTypeText: { fontSize: 14, color: me.ink2 },
  certNumber: {
    fontSize: 13,
    color: me.ink2,
    marginBottom: 4,
  },
  expiryText: { fontSize: 13, color: me.ink2 },
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  boostText: { fontSize: 13, fontWeight: '600', color: me.brand },
  typeCard: {
    backgroundColor: me.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: me.line,
  },
  typeCardSelected: { borderColor: me.brand },
  typeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  typeLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  typeLabelSelected: { color: me.brand },
  typeDescription: {
    fontSize: 12,
    color: me.ink2,
    lineHeight: 17,
    marginLeft: 32,
  },
  initiateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: 16,
  },
  initiateButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
});
