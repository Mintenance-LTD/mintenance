import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface AddClientScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AddClient'>;
}

export const AddClientScreen: React.FC<AddClientScreenProps> = ({
  navigation,
}) => {
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

  const isDirty = !!(
    firstName ||
    lastName ||
    email ||
    phone ||
    companyName ||
    notes
  );
  const allowExit = useUnsavedChanges(isDirty);

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
      // 2026-05-01 audit follow-up: switched from
      // `ClientManagementService.createClient` (direct supabase insert)
      // to the new POST /api/contractor/clients endpoint. Auth +
      // contractor-id come from the bearer token server-side; the
      // wire-level Zod schema + `withApiHandler` enforce the same
      // shape every other contractor write goes through.
      await mobileApiClient.post('/api/contractor/clients', {
        type: 'individual',
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        companyName: companyName.trim() || undefined,
        source: 'manual',
        notes: notes.trim() || undefined,
      });
      toast.success('Client added', `${firstName} has been added to your CRM.`);
      allowExit();
      navigation.goBack();
    } catch {
      toast.error(
        'Failed to add client',
        'Please check your details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Client</Text>
        <TouchableOpacity
          style={[
            styles.headerButton,
            submitting && styles.headerButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.saveText}>
            {submitting ? 'Saving\u2026' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACT DETAILS</Text>

          <Text style={styles.fieldLabel}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder='First name'
            placeholderTextColor={theme.colors.textTertiary}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize='words'
          />

          <Text style={styles.fieldLabel}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder='Last name'
            placeholderTextColor={theme.colors.textTertiary}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize='words'
          />

          <Text style={styles.fieldLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder='email@example.com'
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType='email-address'
            autoCapitalize='none'
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder='+44 7700 900000'
            placeholderTextColor={theme.colors.textTertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType='phone-pad'
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BUSINESS (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder='Company name'
            placeholderTextColor={theme.colors.textTertiary}
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize='words'
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder='Additional notes about this client\u2026'
            placeholderTextColor={theme.colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical='top'
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerButton: { padding: 8, minWidth: 60 },
  headerButtonDisabled: { opacity: 0.5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  scroll: { flex: 1 },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  notesInput: { height: 100, paddingTop: 12 },
});
