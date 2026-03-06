/**
 * ContractViewScreen - View and sign contracts (Phase 4)
 *
 * Both homeowners and contractors can view and sign contracts.
 * Uses the same /api/contracts endpoints as the web app.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HapticService } from '../../utils/haptics';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { JobsStackParamList } from '../../navigation/types';

type ScreenRouteProp = RouteProp<JobsStackParamList, 'ContractView'>;
type ScreenNavigationProp = NativeStackNavigationProp<JobsStackParamList, 'ContractView'>;

interface Props {
  route: ScreenRouteProp;
  navigation: ScreenNavigationProp;
}

interface Contract {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  status: string;
  title: string | null;
  description: string | null;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
  terms: Record<string, unknown>;
  created_at: string;
}

export const ContractViewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRole = user?.role as 'homeowner' | 'contractor' | undefined;

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mobileApiClient.get(`/api/contracts?job_id=${jobId}`);
      const data = response.data as { contracts?: Contract[] };
      setContract(data.contracts?.[0] || null);
    } catch (err) {
      setError('Failed to load contract');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleSign = useCallback(async () => {
    if (!contract) return;

    Alert.alert(
      'Sign Contract',
      'By signing, you agree to all terms and conditions in this contract. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          style: 'default',
          onPress: async () => {
            setSigning(true);
            try {
              await mobileApiClient.post(`/api/contracts/${contract.id}/accept`, {});
              HapticService.success();
              Alert.alert('Signed', 'Contract signed successfully.');
              await fetchContract();
            } catch (err) {
              HapticService.error();
              Alert.alert('Error', 'Failed to sign contract. Please try again.');
            } finally {
              setSigning(false);
            }
          },
        },
      ]
    );
  }, [contract, fetchContract]);

  const nonSignableStatuses = ['accepted', 'rejected', 'cancelled'];
  const canSign =
    contract &&
    !nonSignableStatuses.includes(contract.status) &&
    ((userRole === 'contractor' && !contract.contractor_signed_at) ||
      (userRole === 'homeowner' && !contract.homeowner_signed_at));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading contract...</Text>
      </View>
    );
  }

  if (error || !contract) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="document-text-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={styles.emptyTitle}>{error || 'No Contract Found'}</Text>
        <Text style={styles.emptySubtitle}>
          {userRole === 'contractor'
            ? 'A contract will be created after a bid is accepted.'
            : 'The contractor will create a contract after accepting the bid.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return theme.colors.success;
      case 'pending_contractor':
      case 'pending_homeowner': return '#F59E0B';
      case 'rejected':
      case 'cancelled': return '#EF4444';
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending_contractor': return 'Pending Contractor Signature';
      case 'pending_homeowner': return 'Pending Homeowner Signature';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contract</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
            {getStatusLabel(contract.status)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: canSign ? 120 : 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Contract Amount</Text>
          <Text style={styles.amountValue}>{'\u00A3'}{Number(contract.amount).toLocaleString()}</Text>
        </View>

        {/* Title & Description */}
        {contract.title && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Title</Text>
            <Text style={styles.sectionValue}>{contract.title}</Text>
          </View>
        )}

        {contract.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.sectionValue}>{contract.description}</Text>
          </View>
        )}

        {/* Dates */}
        <View style={styles.datesRow}>
          {contract.start_date && (
            <View style={styles.dateItem}>
              <Text style={styles.sectionLabel}>Start Date</Text>
              <Text style={styles.sectionValue}>{formatDate(contract.start_date)}</Text>
            </View>
          )}
          {contract.end_date && (
            <View style={styles.dateItem}>
              <Text style={styles.sectionLabel}>End Date</Text>
              <Text style={styles.sectionValue}>{formatDate(contract.end_date)}</Text>
            </View>
          )}
        </View>

        {/* Terms */}
        {contract.terms && Object.keys(contract.terms).length > 0 && (
          <View style={styles.termsCard}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            {Object.entries(contract.terms).map(([key, value]) => (
              <View key={key} style={styles.termRow}>
                <Text style={styles.termKey}>{key.replace(/_/g, ' ')}</Text>
                <Text style={styles.termValue}>
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signaturesCard}>
          <Text style={styles.signaturesTitle}>Signatures</Text>

          <View style={styles.signatureRow}>
            <Ionicons
              name={contract.contractor_signed_at ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={contract.contractor_signed_at ? theme.colors.success : theme.colors.textTertiary}
            />
            <View style={styles.signatureInfo}>
              <Text style={styles.signatureLabel}>
                Contractor {contract.contractor_signed_at ? 'signed' : 'pending'}
              </Text>
              {contract.contractor_signed_at && (
                <Text style={styles.signatureDate}>
                  {formatDate(contract.contractor_signed_at)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.signatureRow}>
            <Ionicons
              name={contract.homeowner_signed_at ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={contract.homeowner_signed_at ? theme.colors.success : theme.colors.textTertiary}
            />
            <View style={styles.signatureInfo}>
              <Text style={styles.signatureLabel}>
                Homeowner {contract.homeowner_signed_at ? 'signed' : 'pending'}
              </Text>
              {contract.homeowner_signed_at && (
                <Text style={styles.signatureDate}>
                  {formatDate(contract.homeowner_signed_at)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Accepted Banner */}
        {contract.status === 'accepted' && (
          <View style={styles.acceptedBanner}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.acceptedText}>Contract accepted! Both parties have signed.</Text>
          </View>
        )}
      </ScrollView>

      {/* Sign Button */}
      {canSign && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.signButton, signing && styles.signButtonDisabled]}
            onPress={handleSign}
            disabled={signing}
            accessibilityRole="button"
            accessibilityLabel="Sign contract"
          >
            {signing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="create" size={20} color="#FFFFFF" />
                <Text style={styles.signButtonText}>Sign Contract</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  amountLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  dateItem: {
    flex: 1,
  },
  termsCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  termRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 8,
  },
  termKey: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    width: 120,
  },
  termValue: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  signaturesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  signaturesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  signatureInfo: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  signatureDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.successLight,
    borderRadius: 12,
    padding: 16,
  },
  acceptedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.success,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    ...theme.shadows.large,
  },
  signButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
  },
  signButtonDisabled: {
    opacity: 0.5,
  },
  signButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContractViewScreen;

