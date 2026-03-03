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

const CATEGORIES = ['Health & Safety', 'Electrical', 'Plumbing', 'Gas', 'Construction', 'HVAC', 'Other'];

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

  const isValid = certName.trim().length > 0 && issuer.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Missing fields', 'Please enter the certificate name and issuer.');
      return;
    }

    setLoading(true);
    try {
      await mobileApiClient.post('/api/contractor/certifications', {
        certificateName: certName.trim(),
        issuingOrganisation: issuer.trim(),
        credentialId: credentialId.trim() || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        category: selectedCategory || 'Other',
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
          <Ionicons name="close" size={24} color={theme.colors.textInverse} />
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

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Issuing Organisation *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CITB, Gas Safe Register"
            placeholderTextColor={theme.colors.textTertiary}
            value={issuer}
            onChangeText={setIssuer}
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Credential / Licence Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={theme.colors.textTertiary}
            value={credentialId}
            onChangeText={setCredentialId}
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Issue Date</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={theme.colors.textTertiary}
            value={issueDate}
            onChangeText={setIssueDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY (leave blank if no expiry)"
            placeholderTextColor={theme.colors.textTertiary}
            value={expiryDate}
            onChangeText={setExpiryDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                  {cat}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.primary,
  },
  headerButton: { padding: 8, width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textInverse },
  saveButton: { alignItems: 'flex-end' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.textInverse },
  saveButtonDisabled: { opacity: 0.5 },
  content: { padding: 16 },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    ...theme.shadows.base,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  categoryScroll: { marginTop: 4 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
    backgroundColor: theme.colors.background,
  },
  categoryChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  categoryText: { fontSize: 13, color: theme.colors.textSecondary },
  categoryTextActive: { color: theme.colors.primary, fontWeight: '600' },
});

export default AddCertificationScreen;
