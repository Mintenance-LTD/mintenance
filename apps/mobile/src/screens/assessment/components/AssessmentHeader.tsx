import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
        <Icon name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Property Assessment</Text>
        <Text style={styles.headerSubtitle}>
          {propertyAddress || 'New Assessment'}
        </Text>
      </View>
      <TouchableOpacity style={styles.menuButton}>
        <Icon name="more-vert" size={24} color="#333" />
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
});
