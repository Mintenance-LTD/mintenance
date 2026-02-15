import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const ContractorSocialScreen = () => {
  return (
    <View testID="contractor-social-screen" style={styles.container}>
      <Ionicons name="people-outline" size={64} color={theme.colors.textTertiary} />
      <Text style={styles.title}>Contractor Community</Text>
      <Text style={styles.subtitle}>
        Connect with other contractors, share project updates, and grow your network. Coming soon!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
});

export default ContractorSocialScreen;
