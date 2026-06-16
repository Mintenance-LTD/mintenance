/**
 * BiometricSettingsScreen — Mint Editorial chrome around the
 * `BiometricSettings` management component (2026-06-15).
 *
 * The component was fully built and tested but had no nav target — it
 * was never mounted by any screen, so users could ENABLE biometrics via
 * the post-login prompt but had no in-app way to turn it off or re-enable
 * it. This screen wires it into the Profile/Settings stack (reachable from
 * SettingsHub → Account & Security) so the enable → use → manage loop is
 * complete.
 */

import React from 'react';
import { ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/shared';
import BiometricSettings from '../../components/BiometricSettings';
import { me } from '../../design-system/mint-editorial';

export const BiometricSettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <ScreenHeader
        title='Biometric Sign-In'
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <BiometricSettings />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
});

export default BiometricSettingsScreen;
