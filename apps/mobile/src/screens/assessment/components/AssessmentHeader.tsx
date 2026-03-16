import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../../theme';

interface AssessmentHeaderProps {
  propertyAddress: string | undefined;
  onGoBack: () => void;
}

export const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({
  propertyAddress,
  onGoBack,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
        <Icon name="arrow-back" size={22} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Property Assessment</Text>
        <Text style={styles.headerSubtitle}>
          {propertyAddress || 'New Assessment'}
        </Text>
      </View>
      <TouchableOpacity style={styles.menuButton}>
        <Icon name="more-vert" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
});
