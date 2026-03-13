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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { HapticService } from '../../utils/haptics';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10B981';
      case 'pending_contractor':
      case 'pending_homeowner': return '#F59E0B';
      case 'rejected':
      case 'cancelled': return '#EF4444';
      default: return '#717171';
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

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#222222" />
        <Text style={styles.loadingText}>Loading contract...</Text>
      </View>
    );
  }

  if (error || !contract) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="document-text-outline" size={32} color="#B0B0B0" />
        </View>
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
          <Ionicons name="arrow-back" size={22} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contract</Text>
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={handleViewPdf}
          accessibilityRole="button"
          accessibilityLabel="Download PDF"
        >
          <Ionicons name="download-outline" size={20} color="#222222" />
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
        {/* Draft contract banner */}
        {contract.status === 'draft' && userRole === 'contractor' && (
          <View style={styles.draftBanner}>
            <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" />
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
              color={contract.contractor_signed_at ? '#10B981' : '#B0B0B0'}
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
              color={contract.homeowner_signed_at ? '#10B981' : '#B0B0B0'}
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
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
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
              <Ionicons name="create-outline" size={18} color="#F59E0B" />
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
              placeholderTextColor="#B0B0B0"
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
                  <ActivityIndicator color="#FFFFFF" size="small" />
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
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
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
    backgroundColor: '#F7F7F7',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F7F7F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#717171',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#222222',
    borderRadius: 28,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
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
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  amountLabel: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '500',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#222222',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 15,
    color: '#222222',
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
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
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
    color: '#717171',
    textTransform: 'capitalize',
    width: 120,
  },
  termValue: {
    flex: 1,
    fontSize: 13,
    color: '#222222',
  },
  signaturesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  signaturesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
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
    color: '#222222',
    fontWeight: '500',
  },
  signatureDate: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
  },
  draftBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  draftBannerContent: {
    flex: 1,
  },
  draftBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  draftBannerText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 16,
  },
  acceptedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  signButton: {
    backgroundColor: '#222222',
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
  },
  signButtonDisabled: {
    opacity: 0.5,
  },
  signButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pdfButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
    marginRight: 8,
  },
  revisionSection: {
    marginBottom: 20,
  },
  requestChangesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
  },
  requestChangesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  revisionInfoText: {
    fontSize: 13,
    color: '#717171',
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  rejectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  rejectCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 10,
  },
  rejectInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#222222',
    minHeight: 80,
    marginBottom: 12,
  },
  rejectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  rejectCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rejectCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#717171',
  },
  rejectSubmitButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    minWidth: 110,
    alignItems: 'center',
  },
  rejectSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ContractViewScreen;
