/**
 * DisputeScreen - Create and manage job disputes
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { ScreenHeader, LoadingSpinner } from '../components/shared';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/ApiClient';
import { logger } from '../utils/logger';

interface DisputeScreenParams {
  jobId: string;
  jobTitle: string;
}

interface Props {
  route: RouteProp<{ Dispute: DisputeScreenParams }, 'Dispute'>;
  navigation: StackNavigationProp<Record<string, unknown>>;
}

const DISPUTE_REASONS = [
  { id: 'quality', label: 'Work Quality', icon: 'construct-outline' as const },
  { id: 'incomplete', label: 'Incomplete Work', icon: 'alert-circle-outline' as const },
  { id: 'damage', label: 'Property Damage', icon: 'warning-outline' as const },
  { id: 'timeline', label: 'Timeline Violation', icon: 'time-outline' as const },
  { id: 'communication', label: 'Communication Issues', icon: 'chatbubble-outline' as const },
  { id: 'pricing', label: 'Pricing Dispute', icon: 'cash-outline' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
];

export const DisputeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, jobTitle } = route.params;
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select Reason', 'Please select a reason for the dispute.');
      return;
    }
    if (description.trim().length < 20) {
      Alert.alert('More Details Needed', 'Please provide at least 20 characters describing the issue.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(`/api/jobs/${jobId}/disputes`, {
        reason: selectedReason,
        description: description.trim(),
        created_by: user?.id,
      });
      Alert.alert(
        'Dispute Submitted',
        'Your dispute has been submitted. Our team will review it within 48 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      logger.error('Failed to submit dispute', error);
      Alert.alert('Error', 'Failed to submit dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Raise Dispute" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.jobCard}>
          <Ionicons name="briefcase-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.jobTitle} numberOfLines={1}>{jobTitle}</Text>
        </View>

        <Text style={styles.sectionTitle}>What's the issue?</Text>
        <View style={styles.reasonGrid}>
          {DISPUTE_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonCard,
                selectedReason === reason.id && styles.reasonCardSelected,
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <Ionicons
                name={reason.icon}
                size={24}
                color={selectedReason === reason.id ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[
                styles.reasonLabel,
                selectedReason === reason.id && styles.reasonLabelSelected,
              ]}>
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Describe the issue</Text>
        <TextInput
          style={styles.descriptionInput}
          multiline
          numberOfLines={6}
          placeholder="Please describe the issue in detail. Include any relevant dates, communications, or evidence..."
          placeholderTextColor={theme.colors.placeholder}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {description.length}/500 characters (min 20)
        </Text>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <LoadingSpinner />
          ) : (
            <>
              <Ionicons name="shield-outline" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Dispute</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Disputes are reviewed by our team within 48 hours. Both parties will be
          notified and given the opportunity to respond. Payment will remain in
          escrow until the dispute is resolved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing[4],
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[5],
    ...theme.shadows.sm,
  },
  jobTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing[5],
    gap: theme.spacing[2],
  },
  reasonCard: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  reasonCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  reasonLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  reasonLabelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  descriptionInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 140,
    marginBottom: theme.spacing[1],
  },
  charCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginBottom: theme.spacing[5],
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing[4],
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing[2],
  },
  disclaimer: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default DisputeScreen;
