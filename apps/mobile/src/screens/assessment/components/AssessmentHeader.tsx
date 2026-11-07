import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

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
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel='Go back'
        style={styles.backButton}
        onPress={onGoBack}
      >
        <Icon name='arrow-back' size={22} color={me.ink} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Property Assessment</Text>
        <Text style={styles.headerSubtitle}>
          {propertyAddress || 'New Assessment'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: me.bg2,
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
    color: me.ink,
  },
  headerSubtitle: {
    fontSize: 13,
    color: me.ink2,
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
});
