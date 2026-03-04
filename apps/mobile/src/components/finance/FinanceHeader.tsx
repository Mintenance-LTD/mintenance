import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface FinanceHeaderProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
}

export const FinanceHeader: React.FC<FinanceHeaderProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]} testID="finance-header">
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        testID="back-button"
      >
        <Ionicons name='arrow-back' size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Finance Dashboard</Text>
      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => navigation.navigate('Reporting')}
        testID="export-button"
      >
        <Ionicons name='document-text' size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  exportButton: {
    padding: 8,
  },
});

