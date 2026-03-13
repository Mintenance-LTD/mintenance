/**
 * MFA Security Screen
 *
 * Allows users to enable/disable multi-factor authentication
 * via TOTP authenticator app with recovery codes.
 *
 * @filesize Target: <200 lines
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Platform, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '../../components/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useAuth } from '../../contexts/AuthContext';

interface MFAStatus {
  enabled: boolean;
  method: string | null;
  enrolledAt: string | null;
}

interface EnrollResponse {
  qrCode: string;
  secret: string;
  recoveryCodes: string[];
}

export const MFASecurityScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [enrollData, setEnrollData] = useState<EnrollResponse | null>(null);

  const { data: mfaStatus, isLoading } = useQuery<MFAStatus>({
    queryKey: ['mfa-status', user?.id],
    queryFn: () => mobileApiClient.get('/api/auth/mfa/status'),
    enabled: !!user?.id,
  });

  const enrollMutation = useMutation({
    mutationFn: () => mobileApiClient.post<EnrollResponse>('/api/auth/mfa/enroll/totp', {}),
    onSuccess: (data) => {
      setEnrollData(data);
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
    },
    onError: () => Alert.alert('Error', 'Failed to enable MFA. Please try again.'),
  });

  const disableMutation = useMutation({
    mutationFn: () => mobileApiClient.post('/api/auth/mfa/disable', {}),
    onSuccess: () => {
      setEnrollData(null);
      setShowRecoveryCodes(false);
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
      Alert.alert('Success', 'MFA has been disabled.');
    },
    onError: () => Alert.alert('Error', 'Failed to disable MFA. Please try again.'),
  });

  const handleToggle = () => {
    if (mfaStatus?.enabled) {
      Alert.alert('Disable MFA', 'This will make your account less secure. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => disableMutation.mutate() },
      ]);
    } else {
      enrollMutation.mutate();
    }
  };

  const isMutating = enrollMutation.isPending || disableMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="MFA Security" showBack onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#222222" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconChip, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#6366F1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Two-Factor Authentication</Text>
                    <Text style={styles.sublabel}>
                      {mfaStatus?.enabled ? 'Enabled' : 'Disabled'}
                      {mfaStatus?.enrolledAt ? ` since ${new Date(mfaStatus.enrolledAt).toLocaleDateString()}` : ''}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={mfaStatus?.enabled ?? false}
                  onValueChange={handleToggle}
                  disabled={isMutating}
                  trackColor={{ false: '#EBEBEB', true: '#222222' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {enrollData && !mfaStatus?.enabled && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Setup Instructions</Text>
                <Text style={styles.bodyText}>
                  1. Install an authenticator app (Google Authenticator, Authy, etc.)
                </Text>
                <Text style={styles.bodyText}>2. Add a new account using this secret key:</Text>
                <View style={styles.secretBox}>
                  <Text style={styles.secretText} selectable>{enrollData.secret}</Text>
                </View>
                <Text style={styles.bodyText}>3. Enter the 6-digit code from your app to verify.</Text>
              </View>
            )}

            {(enrollData?.recoveryCodes || mfaStatus?.enabled) && (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setShowRecoveryCodes(!showRecoveryCodes)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconChip, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="key-outline" size={18} color="#F59E0B" />
                    </View>
                    <Text style={styles.label}>Recovery Codes</Text>
                  </View>
                  <Ionicons name={showRecoveryCodes ? 'chevron-up' : 'chevron-down'} size={16} color="#B0B0B0" />
                </TouchableOpacity>
                {showRecoveryCodes && enrollData?.recoveryCodes && (
                  <View style={styles.codesContainer}>
                    <Text style={styles.warningText}>Save these codes in a safe place. Each can only be used once.</Text>
                    {enrollData.recoveryCodes.map((code, i) => (
                      <Text key={i} style={styles.codeText} selectable>{code}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Text style={styles.footnote}>
              MFA adds an extra layer of security by requiring a verification code from your authenticator app each time you sign in.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconChip: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '500', color: '#222222' },
  sublabel: { fontSize: 12, color: '#717171', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#222222', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  bodyText: { fontSize: 13, color: '#717171', lineHeight: 20, paddingHorizontal: 14, marginBottom: 6 },
  secretBox: { backgroundColor: '#F7F7F7', borderRadius: 8, marginHorizontal: 14, marginVertical: 8, padding: 12 },
  secretText: { fontSize: 14, fontWeight: '600', color: '#222222', textAlign: 'center', letterSpacing: 1 },
  codesContainer: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EBEBEB' },
  warningText: { fontSize: 12, color: '#F59E0B', marginVertical: 8 },
  codeText: { fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), color: '#222222', paddingVertical: 3 },
  footnote: { fontSize: 12, color: '#B0B0B0', lineHeight: 18, paddingHorizontal: 4, marginTop: 8 },
});

export default MFASecurityScreen;
