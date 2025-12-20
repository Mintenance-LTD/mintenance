import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../theme';

interface FinanceHeaderProps {
  navigation: StackNavigationProp<any>;
}

export const FinanceHeader: React.FC<FinanceHeaderProps> = ({ navigation }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name='arrow-back' size={24} color={theme.colors.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Finance Dashboard</Text>
      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => navigation.navigate('FinanceReports')}
      >
        <Ionicons name='document-text' size={24} color={theme.colors.white} />
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  exportButton: {
    padding: 8,
  },
});
