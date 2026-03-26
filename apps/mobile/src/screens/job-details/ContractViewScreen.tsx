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
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { HapticService } from '../../utils/haptics';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient, API_BASE_URL } from '../../utils/mobileApiClient';
import { JobCRUDService } from '../../services/JobCRUDService';
import { JobsStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { ContractSignatureSection } from './components/ContractSignatureSection';
import { ContractTermsView } from './components/ContractTermsView';
import { ContractRevisionRequest } from './components/ContractRevisionRequest';
import { ContractPartiesSection } from './components/ContractPartiesSection';
import { ContractTimeline } from './components/ContractTimeline';
import { styles } from './contractViewStyles';

type ScreenRouteProp = RouteProp<JobsStackParamList, 'ContractView'>;
type ScreenNavigationProp = NativeStackNavigationProp<
  JobsStackParamList,
  'ContractView'
>;

interface Props {
  route: ScreenRouteProp;
  navigation: ScreenNavigationProp;
}

interface ContractParty {
  first_name?: string;
  last_name?: string;
  company_name?: string;
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
  contractorName: string;
  homeownerName: string;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const getStatusColor = (status: string) => {
  switch (status) {
    case 'accepted':
      return theme.colors.primary;
    case 'pending_contractor':
    case 'pending_homeowner':
      return theme.colors.accent;
    case 'rejected':
    case 'cancelled':
      return theme.colors.error;
    default:
      return theme.colors.textSecondary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending_contractor':
      return 'Pending Contractor Signature';
    case 'pending_homeowner':
      return 'Pending Homeowner Signature';
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

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
      const row = await JobCRUDService.getContractByJobId(jobId);
      if (row) {
        const c = row.contractor as ContractParty | undefined;
        const h = row.homeowner as ContractParty | undefined;
        setContract({
          id: row.id as string,
          job_id: row.job_id as string,
          contractor_id: row.contractor_id as string,
          homeowner_id: row.homeowner_id as string,
          status: row.status as string,
          title: row.title as string | null,
          description: row.description as string | null,
          amount: row.amount as number,
          start_date: row.start_date as string | null,
          end_date: row.end_date as string | null,
          contractor_signed_at: row.contractor_signed_at as string | null,
          homeowner_signed_at: row.homeowner_signed_at as string | null,
          terms: (row.terms as Record<string, unknown>) || {},
          created_at: row.created_at as string,
          contractorName:
            c?.company_name ||
            [c?.first_name, c?.last_name].filter(Boolean).join(' ') ||
            'Contractor',
          homeownerName:
            [h?.first_name, h?.last_name].filter(Boolean).join(' ') ||
            'Homeowner',
        });
      } else {
        setContract(null);
      }
    } catch {
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
              await mobileApiClient.post(
                `/api/contracts/${contract.id}/accept`,
                {}
              );
              HapticService.success();
              Alert.alert('Signed', 'Contract signed successfully.');
              await fetchContract();
            } catch {
              HapticService.error();
              Alert.alert(
                'Error',
                'Failed to sign contract. Please try again.'
              );
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
    const pdfUrl = `${API_BASE_URL}/api/contracts/${contract.id}/pdf`;
    try {
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await WebBrowser.openBrowserAsync(pdfUrl);
      } else {
        Alert.alert(
          'Cannot Open PDF',
          'Unable to open the contract PDF on this device.'
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to open contract PDF.');
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
      Alert.alert(
        'Changes Requested',
        'The contractor has been notified of your requested changes.'
      );
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

  const handleCancelReject = useCallback(() => {
    setShowRejectInput(false);
    setRejectReason('');
  }, []);

  const nonSignableStatuses = ['accepted', 'rejected', 'cancelled'];
  const canSign =
    contract &&
    !nonSignableStatuses.includes(contract.status) &&
    ((userRole === 'contractor' && !contract.contractor_signed_at) ||
      (userRole === 'homeowner' && !contract.homeowner_signed_at));
  const canReject =
    contract !== null &&
    contract.status === 'pending_homeowner' &&
    userRole === 'homeowner';
  const showPrepareButton =
    contract?.status === 'draft' && userRole === 'contractor';
  const showSignButton = canSign && contract?.status !== 'draft';

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size='large' color={theme.colors.textPrimary} />
        <Text style={styles.loadingText}>Loading contract...</Text>
      </View>
    );
  }

  if (error || !contract) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconWrap}>
          <Ionicons
            name='document-text-outline'
            size={32}
            color={theme.colors.textTertiary}
          />
        </View>
        <Text style={styles.emptyTitle}>{error || 'No Contract Found'}</Text>
        <Text style={styles.emptySubtitle}>
          {userRole === 'contractor'
            ? 'A contract will be created after a bid is accepted.'
            : 'The contractor will create a contract after accepting the bid.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasBottomBar = showPrepareButton || showSignButton;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.surface}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons
            name='arrow-back'
            size={22}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contract</Text>
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={handleViewPdf}
          accessibilityRole='button'
          accessibilityLabel='Download PDF'
        >
          <Ionicons
            name='download-outline'
            size={20}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(contract.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(contract.status) },
            ]}
          >
            {getStatusLabel(contract.status)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: hasBottomBar ? 120 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Draft contract banner */}
        {showPrepareButton && (
          <View style={styles.draftBanner}>
            <Ionicons
              name='alert-circle-outline'
              size={22}
              color={theme.colors.accent}
            />
            <View style={styles.draftBannerContent}>
              <Text style={styles.draftBannerTitle}>
                Contract needs preparation
              </Text>
              <Text style={styles.draftBannerText}>
                Fill in contract terms, dates, and business details before the
                homeowner can review and sign.
              </Text>
            </View>
          </View>
        )}

        {/* Parties */}
        <ContractPartiesSection
          contractorName={contract.contractorName}
          homeownerName={contract.homeownerName}
        />

        {/* Amount + Escrow Badge */}
        <View style={styles.amountCard}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text style={styles.amountLabel}>CONTRACT AMOUNT</Text>
              <Text style={styles.amountValue}>
                {'\u00A3'}
                {Number(contract.amount).toLocaleString()}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: theme.colors.primaryLight,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Ionicons
                name='shield-checkmark'
                size={14}
                color={theme.colors.primary}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: theme.colors.primary,
                }}
              >
                Escrow Protected
              </Text>
            </View>
          </View>
        </View>

        {/* Title, description, dates, terms */}
        <ContractTermsView
          title={contract.title}
          description={contract.description}
          start_date={contract.start_date}
          end_date={contract.end_date}
          terms={contract.terms}
          formatDate={formatDate}
        />

        {/* Signatures + accepted banner */}
        <ContractSignatureSection contract={contract} formatDate={formatDate} />

        {/* Timeline */}
        <ContractTimeline
          createdAt={contract.created_at}
          contractorSignedAt={contract.contractor_signed_at}
          homeownerSignedAt={contract.homeowner_signed_at}
          status={contract.status}
        />

        {/* Revision request */}
        <ContractRevisionRequest
          canReject={canReject}
          showRejectInput={showRejectInput}
          rejectReason={rejectReason}
          rejecting={rejecting}
          onShowRejectInput={() => setShowRejectInput(true)}
          onChangeReason={setRejectReason}
          onCancel={handleCancelReject}
          onSubmit={handleReject}
        />
      </ScrollView>

      {/* Prepare Contract Button (for draft contracts) */}
      {showPrepareButton && (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <TouchableOpacity
            style={styles.signButton}
            onPress={() =>
              navigation.navigate('ContractPreparation', {
                jobId,
                jobTitle: contract.title || undefined,
              })
            }
            accessibilityRole='button'
            accessibilityLabel='Prepare contract'
          >
            <Ionicons
              name='document-text'
              size={20}
              color={theme.colors.textInverse}
            />
            <Text style={styles.signButtonText}>Prepare Contract</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign Button */}
      {showSignButton && (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <TouchableOpacity
            style={[styles.signButton, signing && styles.signButtonDisabled]}
            onPress={handleSign}
            disabled={signing}
            accessibilityRole='button'
            accessibilityLabel='Sign contract'
          >
            {signing ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <Ionicons
                  name='create'
                  size={20}
                  color={theme.colors.textInverse}
                />
                <Text style={styles.signButtonText}>Sign Contract</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ContractViewScreen;
