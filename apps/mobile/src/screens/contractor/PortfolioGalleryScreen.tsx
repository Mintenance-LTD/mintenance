// ARCHIVED: Portfolio feature moved to apps/mobile/src/_archived/screens/PortfolioGalleryScreen.tsx
// Stub kept to prevent import errors in navigation.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { ScreenHeader } from '../../components/shared';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PortfolioGallery'>;

const PortfolioGalleryScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Portfolio Gallery" showBack onBack={() => navigation.goBack()} />
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

export { PortfolioGalleryScreen };
export default PortfolioGalleryScreen;
