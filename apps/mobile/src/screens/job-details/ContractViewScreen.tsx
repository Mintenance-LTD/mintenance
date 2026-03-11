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
  Linking,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
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
  const [rejecting, setRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const userRole = user?.role as 'homeowner' | 'contractor' | undefined;

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mobileApiClient.get(`/api/contracts?job_id=${jobId}`) as { data: { contracts?: Contract[] } };
      const data = response.data;
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

  const handleViewPdf = useCallback(async () => {
    if (!contract) return;
    const appUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const pdfUrl = `${appUrl}/api/contracts/${contract.id}/pdf`;
    try {
      await WebBrowser.openBrowserAsync(pdfUrl);
    } catch {
      Linking.openURL(pdfUrl);
    }
  }, [contract]);

  const handleReject = useCallback(async () => {
    if (!contract) return;
    setRejecting(true);
    try {
      await mobileApiClient.post(`/api/contracts/${contract.id}/reject`, {
        reason: rejectReason.trim(),
      });
      HapticService.success();
      Alert.alert('Changes Requested', 'The contractor has been notified of your requested changes.');
      setShowRejectInput(false);
      setRejectReason('');
      await fetchContract();
    } catch {
      HapticService.error();
      Alert.alert('Error', 'Failed to request changes. Please try again.');
    } finally {
      setRejecting(false);
    }
  }, [contract, rejectReason, fetchContract]);

  const nonSignableStatuses = ['accepted', 'rejected', 'cancelled'];
  const canSign =
    contract &&
    !nonSignableStatuses.includes(contract.status) &&
    ((userRole === 'contractor' && !contract.contractor_signed_at) ||
      (userRole === 'homeowner' && !contract.homeowner_signed_at));

  const canReject =
    contract &&
    contract.status === 'pending_homeowner' &&
    userRole === 'homeowner';

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
      case 'pending_homeowner': return theme.colors.warning;
      case 'rejected':
      case 'cancelled': return theme.colors.error;
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
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={handleViewPdf}
          accessibilityRole="button"
          accessibilityLabel="Download PDF"
        >
          <Ionicons name="download-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
            {getStatusLabel(contract.status)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: canSign || (contract.status === 'draft' && userRole === 'contractor') ? 120 : 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Draft contract banner — contractor needs to fill in terms */}
        {contract.status === 'draft' && userRole === 'contractor' && (
          <View style={styles.draftBanner}>
            <Ionicons name="alert-circle-outline" size={22} color={theme.colors.warning} />
            <View style={styles.draftBannerContent}>
              <Text style={styles.draftBannerTitle}>Contract needs preparation</Text>
              <Text style={styles.draftBannerText}>
                Fill in contract terms, dates, and business details before the homeowner can review and sign.
              </Text>
            </View>
          </View>
        )}

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

        {/* Request Contract Revision */}
        {canReject && !showRejectInput && (
          <View style={styles.revisionSection}>
            <TouchableOpacity
              style={styles.requestChangesButton}
              onPress={() => setShowRejectInput(true)}
              accessibilityRole="button"
              accessibilityLabel="Request contract revision"
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.warning} />
              <Text style={styles.requestChangesText}>Request Contract Revision</Text>
            </TouchableOpacity>
            <Text style={styles.revisionInfoText}>
              The contractor will be notified to update the contract terms. This does not cancel the job.
            </Text>
          </View>
        )}

        {showRejectInput && (
          <View style={styles.rejectCard}>
            <Text style={styles.rejectCardTitle}>What changes are needed?</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Describe what needs to be changed (e.g., dates, amounts, terms)..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={3}
              value={rejectReason}
              onChangeText={setRejectReason}
              textAlignVertical="top"
              accessibilityLabel="Describe contract changes needed"
              accessibilityHint="Explain what terms or dates need to be updated"
            />
            <Text style={styles.revisionInfoText}>
              The contractor will be notified to update the contract terms. This does not cancel the job.
            </Text>
            <View style={styles.rejectActions}>
              <TouchableOpacity
                style={styles.rejectCancelButton}
                onPress={() => { setShowRejectInput(false); setRejectReason(''); }}
              >
                <Text style={styles.rejectCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectSubmitButton, rejecting && { opacity: 0.5 }]}
                onPress={handleReject}
                disabled={rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator color={theme.colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.rejectSubmitText}>Send Revision Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Prepare Contract Button (for draft contracts) */}
      {contract.status === 'draft' && userRole === 'contractor' && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={styles.signButton}
            onPress={() => navigation.navigate('ContractPreparation', { jobId, jobTitle: contract.title || undefined })}
            accessibilityRole="button"
            accessibilityLabel="Prepare contract"
          >
            <Ionicons name="document-text" size={20} color={theme.colors.textInverse} />
            <Text style={styles.signButtonText}>Prepare Contract</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign Button */}
      {canSign && contract.status !== 'draft' && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.signButton, signing && styles.signButtonDisabled]}
            onPress={handleSign}
            disabled={signing}
            accessibilityRole="button"
            accessibilityLabel="Sign contract"
          >
            {signing ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <Ionicons name="create" size={20} color={theme.colors.textInverse} />
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
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: theme.spacing[5],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.base,
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing[5],
  },
  amountCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    alignItems: 'center',
    marginBottom: theme.spacing[5],
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  amountLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  sectionValue: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  datesRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing[5],
  },
  dateItem: {
    flex: 1,
  },
  termsCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing[5],
  },
  termsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  termRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm - 2,
    gap: theme.spacing.sm,
  },
  termKey: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    width: 120,
  },
  termValue: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  signaturesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing[5],
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  signaturesTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing.sm,
  },
  signatureInfo: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  signatureDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  draftBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3] + 2,
    gap: theme.spacing[3] - 2,
    marginBottom: theme.spacing[5],
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
  },
  draftBannerContent: {
    flex: 1,
  },
  draftBannerTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },
  draftBannerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    lineHeight: 18,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3] - 2,
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  acceptedText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.success,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    ...theme.shadows.large,
  },
  signButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.buttonHeightLarge,
  },
  signButtonDisabled: {
    opacity: 0.5,
  },
  signButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  pdfButton: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary + '15',
    marginRight: theme.spacing.sm,
  },
  revisionSection: {
    marginBottom: theme.spacing[5],
  },
  requestChangesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing[3] + 2,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.accentLight,
  },
  requestChangesText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning,
  },
  revisionInfoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  rejectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing[5],
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
  },
  rejectCardTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3] - 2,
  },
  rejectInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing[3],
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    minHeight: 80,
    marginBottom: theme.spacing[3],
  },
  rejectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[3] - 2,
  },
  rejectCancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing[3] - 2,
    borderRadius: theme.borderRadius.base,
  },
  rejectCancelText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  rejectSubmitButton: {
    paddingHorizontal: theme.spacing.md + 2,
    paddingVertical: theme.spacing[3] - 2,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.warning,
    minWidth: 110,
    alignItems: 'center',
  },
  rejectSubmitText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
});

export default ContractViewScreen;

