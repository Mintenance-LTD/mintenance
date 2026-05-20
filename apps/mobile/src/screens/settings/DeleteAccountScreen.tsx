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

const CONSEQUENCES = [
  {
    icon: 'person-remove-outline',
    text: 'Your profile and all personal data will be permanently removed',
  },
  {
    icon: 'briefcase-outline',
    text: 'All active jobs will be cancelled and contractors notified',
  },
  {
    icon: 'chatbubble-outline',
    text: 'Message history will be deleted from your account',
  },
  {
    icon: 'card-outline',
    text: 'Payment methods and invoice records will be cleared',
  },
  {
    icon: 'star-outline',
    text: 'Reviews you have written and received will be anonymised',
  },
  {
    icon: 'time-outline',
    text: 'This action is irreversible and cannot be undone',
  },
] as const;

export const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () =>
      mobileApiClient.post('/api/user/delete-account', {
        confirmation: 'DELETE',
      }),
    onSuccess: () => {
      Alert.alert(
        'Account Deleted',
        'Your account has been scheduled for deletion. You will be signed out.',
        [{ text: 'OK', onPress: () => signOut?.() }]
      );
    },
    onError: (err: unknown) =>
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'Failed to delete account. Please contact support.'
      ),
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
