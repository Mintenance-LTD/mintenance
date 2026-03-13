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
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../../components/ui/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
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
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

    if (!user?.id) {
      toast.error('Not authenticated', 'Please log in again.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.from('contractor_certifications').insert({
        contractor_id: user.id,
        name: certName.trim(),
        issuer: issuer.trim(),
        credential_id: credentialId.trim() || null,
        issue_date: issueDateISO,
        expiry_date: expiryDateISO || null,
        category: selectedCategory || 'general',
      });
      if (err) throw new Error(err.message);
      queryClient.invalidateQueries({ queryKey: ['contractor-certifications'] });
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Certification</Text>
        <TouchableOpacity
          style={[styles.headerButton, styles.saveButton]}
          onPress={handleSave}
          disabled={loading || !isValid}
        >
          <Text style={[styles.saveButtonText, (!isValid || loading) && styles.saveButtonDisabled]}>
            {loading ? 'Saving\u2026' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Certificate Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CSCS Card, Gas Safe Certificate"
            placeholderTextColor="#B0B0B0"
            value={certName}
            onChangeText={setCertName}
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Issuing Organisation *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CITB, Gas Safe Register"
            placeholderTextColor="#B0B0B0"
            value={issuer}
            onChangeText={setIssuer}
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Credential / Licence Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#B0B0B0"
            value={credentialId}
            onChangeText={setCredentialId}
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Issue Date</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#B0B0B0"
            value={issueDate}
            onChangeText={setIssueDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY (leave blank if no expiry)"
            placeholderTextColor="#B0B0B0"
            value={expiryDate}
            onChangeText={setExpiryDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Category</Text>
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
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8, width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222222' },
  saveButton: { alignItems: 'flex-end' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#222222' },
  saveButtonDisabled: { opacity: 0.5 },
  content: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#222222',
  },
  categoryScroll: { marginTop: 4 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F7F7F7',
  },
  categoryChipActive: {
    backgroundColor: '#10B981',
  },
  categoryText: { fontSize: 13, color: '#717171' },
  categoryTextActive: { color: '#FFFFFF', fontWeight: '600' },
});

export default AddCertificationScreen;
