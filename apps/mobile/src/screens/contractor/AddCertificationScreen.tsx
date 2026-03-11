import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { useToast } from '../../components/ui/Toast';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { ProfileStackParamList } from '../../navigation/types';

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AddCertification'>;
}

const CATEGORY_OPTIONS = [
  { label: 'Safety', value: 'safety' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Kitchen', value: 'kitchen' },
  { label: 'General', value: 'general' },
  { label: 'Other', value: 'other' },
] as const;

/** Convert DD/MM/YYYY → YYYY-MM-DD. Returns undefined if input is blank or unparseable. */
const toISODate = (ddmmyyyy: string): string | undefined => {
  const trimmed = ddmmyyyy.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split('/');
  if (parts.length !== 3) return undefined;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length !== 4) return undefined;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
};

export const AddCertificationScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [certName, setCertName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const issueDateISO = toISODate(issueDate);
  const expiryDateISO = toISODate(expiryDate);
  const isValid =
    certName.trim().length > 0 &&
    issuer.trim().length > 0 &&
    !!issueDateISO;

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Missing fields', 'Please enter the certificate name, issuer, and a valid issue date (DD/MM/YYYY).');
      return;
    }

    setLoading(true);
    try {
      await mobileApiClient.post('/api/contractor/certifications', {
        name: certName.trim(),
        issuer: issuer.trim(),
        credentialId: credentialId.trim() || undefined,
        issueDate: issueDateISO,
        expiryDate: expiryDateISO || undefined,
        category: selectedCategory || 'general',
      });
      toast.success('Certification added', `${certName} has been saved`);
      navigation.goBack();
    } catch {
      toast.error('Failed to save certification', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Certification</Text>
        <TouchableOpacity
          style={[styles.headerButton, styles.saveButton]}
          onPress={handleSave}
          disabled={loading || !isValid}
        >
          <Text style={[styles.saveButtonText, (!isValid || loading) && styles.saveButtonDisabled]}>
            {loading ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Certificate Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CSCS Card, Gas Safe Certificate"
            placeholderTextColor={theme.colors.textTertiary}
            value={certName}
            onChangeText={setCertName}
          />

          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>Issuing Organisation *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CITB, Gas Safe Register"
            placeholderTextColor={theme.colors.textTertiary}
            value={issuer}
            onChangeText={setIssuer}
          />

          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>Credential / Licence Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={theme.colors.textTertiary}
            value={credentialId}
            onChangeText={setCredentialId}
          />

          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>Issue Date</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={theme.colors.textTertiary}
            value={issueDate}
            onChangeText={setIssueDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY (leave blank if no expiry)"
            placeholderTextColor={theme.colors.textTertiary}
            value={expiryDate}
            onChangeText={setExpiryDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORY_OPTIONS.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.categoryChip, selectedCategory === cat.value && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Text style={[styles.categoryText, selectedCategory === cat.value && styles.categoryTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing[3],
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerButton: { padding: theme.spacing.sm, width: 60 },
  headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary },
  saveButton: { alignItems: 'flex-end' },
  saveButtonText: { fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary },
  saveButtonDisabled: { opacity: 0.5 },
  content: { padding: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    ...theme.shadows.base,
  },
  fieldLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  categoryScroll: { marginTop: theme.spacing.xs },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  categoryChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  categoryText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
  categoryTextActive: { color: theme.colors.textInverse, fontWeight: theme.typography.fontWeight.semibold },
});

export default AddCertificationScreen;
