// ARCHIVED: Social feature moved to apps/mobile/src/_archived/screens/SocialScreen.tsx
// Stub kept to prevent import errors in navigation.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenHeader } from '../../components/shared';

export const SocialScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Social" showBack onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.text}>This feature is coming soon.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center' },
});

export default SocialScreen;
