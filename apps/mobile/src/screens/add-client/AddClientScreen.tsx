import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { ClientManagementService } from '../../services/client-management';
import type { ProfileStackParamList } from '../../navigation/types';

interface AddClientScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AddClient'>;
}

export const AddClientScreen: React.FC<AddClientScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (!firstName.trim()) {
      toast.error('First name required');
      return;
    }
    if (!email.trim()) {
      toast.error('Email required');
      return;
    }

    setSubmitting(true);
    try {
      const service = new ClientManagementService();
      await service.createClient({
        contractorId: user.id,
        type: 'individual',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        companyName: companyName.trim() || undefined,
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'GB',
        },
        source: 'manual',
        notes: notes.trim() || undefined,
      });
      toast.success('Client added', `${firstName} has been added to your CRM.`);
      navigation.goBack();
    } catch {
      toast.error('Failed to add client', 'Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Client</Text>
        <TouchableOpacity
          style={[styles.headerButton, submitting && styles.headerButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.saveText}>{submitting ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>

          <Text style={styles.fieldLabel}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="First name"
            placeholderTextColor={theme.colors.textTertiary}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Last name"
            placeholderTextColor={theme.colors.textTertiary}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+44 7700 900000"
            placeholderTextColor={theme.colors.textTertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Company name"
            placeholderTextColor={theme.colors.textTertiary}
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Additional notes about this client…"
            placeholderTextColor={theme.colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8, minWidth: 60 },
  headerButtonDisabled: { opacity: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  saveText: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, textAlign: 'right' },
  scroll: { flex: 1 },
  section: {
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 8,
  },
  notesInput: { height: 100, paddingTop: 10 },
});

export default AddClientScreen;
