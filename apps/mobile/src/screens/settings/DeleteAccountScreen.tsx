/**
 * Delete Account Screen
 *
 * Provides a secure account deletion flow with multiple confirmation
 * steps to prevent accidental data loss.
 *
 * @filesize Target: <200 lines
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { ScreenHeader } from '../../components/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';

// 2026-05-23: copy made honest against the actual server behaviour
// after the role-aware delete_user_data migration.
//   * Homeowner role → jobs they posted are deleted (with the bids
//     placed on them); their properties are dropped.
//   * Contractor role → jobs they were assigned to are unassigned and
//     reverted to 'posted' so the homeowner can re-source. Bids the
//     contractor authored are dropped.
// The previous copy promised "contractors notified" — there is no
// notification fan-out in the server path today; rewritten to not
// over-promise.
const HOMEOWNER_CONSEQUENCES = [
  {
    icon: 'person-remove-outline',
    text: 'Your profile and all personal data will be permanently removed',
  },
  {
    icon: 'briefcase-outline',
    text: 'Jobs you posted will be deleted, along with the bids on them',
  },
  {
    icon: 'home-outline',
    text: 'Properties you own on Mintenance will be removed',
  },
  {
    icon: 'chatbubble-outline',
    text: 'Message history will be deleted from your account',
  },
  {
    icon: 'time-outline',
    text: 'This action takes effect immediately and cannot be undone',
  },
] as const;

const CONTRACTOR_CONSEQUENCES = [
  {
    icon: 'person-remove-outline',
    text: 'Your profile and all personal data will be permanently removed',
  },
  {
    icon: 'document-text-outline',
    text: 'Bids you placed will be removed from every job',
  },
  // 2026-05-24 audit-41 P3: previously promised active jobs "revert to
  // open so the homeowner can find another contractor", but the API
  // route blocks deletion outright when there's an assigned or
  // in-progress job (audit-25 ACTIVE_JOBS_CONTRACTOR blocker). Align
  // the copy with the actual server behaviour so the contractor isn't
  // told one outcome and then hit with the opposite as a blocker.
  {
    icon: 'briefcase-outline',
    text: 'You must withdraw from any assigned or in-progress jobs first — the homeowner needs to find another contractor before your account can be removed',
  },
  {
    icon: 'chatbubble-outline',
    text: 'Message history will be deleted from your account',
  },
  {
    icon: 'time-outline',
    text: 'This action takes effect immediately and cannot be undone',
  },
] as const;

export const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  // 2026-05-23: role-aware copy — see HOMEOWNER_CONSEQUENCES /
  // CONTRACTOR_CONSEQUENCES above. Fall back to homeowner copy when
  // the role isn't loaded yet (rare, but safe — the API path will
  // refuse if profile is missing).
  const CONSEQUENCES =
    user?.role === 'contractor'
      ? CONTRACTOR_CONSEQUENCES
      : HOMEOWNER_CONSEQUENCES;

  const deleteMutation = useMutation({
    mutationFn: () =>
      mobileApiClient.post('/api/user/delete-account', {
        confirmation: 'DELETE',
      }),
    onSuccess: () => {
      // 2026-05-23: previously this said "scheduled for deletion" but
      // the API hard-deletes immediately (data + auth.users in a single
      // transaction). Aligned the copy to match reality.
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been permanently deleted. You will be signed out.',
        [{ text: 'OK', onPress: () => signOut?.() }]
      );
    },
    onError: (err: unknown) => {
      // 2026-05-23: the API now returns 409 with `{ blockers: [...] }`
      // when held escrow / active jobs prevent deletion. Surface the
      // first blocker message rather than the generic
      // "Failed to delete account" — gives the user actionable info.
      const fallback =
        err instanceof Error
          ? err.message
          : 'Failed to delete account. Please contact support.';
      type Blocker = { code: string; message: string };
      type ApiErr = {
        response?: { data?: { blockers?: Blocker[]; error?: string } };
        blockers?: Blocker[];
      };
      const apiErr = err as ApiErr;
      const blockers =
        apiErr.response?.data?.blockers ?? apiErr.blockers ?? null;
      if (Array.isArray(blockers) && blockers.length > 0) {
        Alert.alert(
          'Resolve these first',
          blockers.map((b) => `• ${b.message}`).join('\n\n'),
          [{ text: 'OK' }]
        );
        return;
      }
      Alert.alert('Error', fallback);
    },
  });

  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = () => {
    if (!isConfirmed) return;
    Alert.alert(
      'Final Confirmation',
      `Are you sure you want to permanently delete your account (${user?.email})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='Delete Account'
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <View style={styles.warningIcon}>
              <Ionicons name='warning-outline' size={22} color={me.errFg} />
            </View>
            <Text style={styles.warningTitle}>Danger Zone</Text>
          </View>
          <Text style={styles.warningBody}>
            Deleting your account is permanent. Please review what will happen
            before proceeding.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>What Happens</Text>
        <View style={styles.card}>
          {CONSEQUENCES.map((item, i) => (
            <View
              key={item.text}
              style={[
                styles.consequenceRow,
                i < CONSEQUENCES.length - 1 && styles.rowBorder,
              ]}
            >
              <Ionicons
                name={item.icon as 'person-remove-outline'}
                size={17}
                color={me.errFg}
              />
              <Text style={styles.consequenceText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Confirmation</Text>
        <View style={styles.card}>
          <View style={styles.confirmSection}>
            <Text style={styles.confirmPrompt}>
              Type <Text style={styles.confirmKeyword}>DELETE</Text> below to
              confirm:
            </Text>
            <TextInput
              style={styles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder='Type DELETE'
              placeholderTextColor={me.ink3}
              autoCapitalize='characters'
              autoCorrect={false}
              editable={!deleteMutation.isPending}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            !isConfirmed && styles.deleteButtonDisabled,
          ]}
          onPress={handleDelete}
          disabled={!isConfirmed || deleteMutation.isPending}
          activeOpacity={0.8}
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator size='small' color={me.onBrand} />
          ) : (
            <>
              <Ionicons name='trash-outline' size={18} color={me.onBrand} />
              <Text style={styles.deleteButtonText}>
                Permanently Delete Account
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          If you have concerns about your data, consider exporting it first from
          Settings &gt; Export My Data.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  warningCard: {
    backgroundColor: me.errBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: me.errFg,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.errBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTitle: { fontSize: 17, fontWeight: '700', color: me.errFg },
  warningBody: { fontSize: 13, color: me.errFg, lineHeight: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    ...me.shadow.card,
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  consequenceText: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 19,
    flex: 1,
  },
  confirmSection: { padding: 14 },
  confirmPrompt: {
    fontSize: 14,
    color: me.ink,
    marginBottom: 10,
  },
  confirmKeyword: { fontWeight: '700', color: me.errFg },
  input: {
    backgroundColor: me.bg2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: me.line,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: me.errFg,
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 12,
  },
  deleteButtonDisabled: { backgroundColor: me.bg3 },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.onBrand,
  },
  footnote: {
    fontSize: 12,
    color: me.ink3,
    lineHeight: 18,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
