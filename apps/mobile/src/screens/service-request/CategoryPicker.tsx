import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { styles } from './styles';
import { serviceCategories, type ServiceCategory } from './types';

interface CategoryPickerProps {
  onBack: () => void;
  onSelect: (category: ServiceCategory) => void;
  headerPaddingTop: number;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  onBack,
  onSelect,
  headerPaddingTop,
}) => (
  <View style={styles.container}>
    <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} accessibilityRole="header">
        Request Service
      </Text>
      <View style={styles.placeholder} />
    </View>

    <ScrollView style={styles.content}>
      <View style={styles.categorySection}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          What service do you need?
        </Text>
        <Text style={styles.sectionSubtitle}>Select a category to get started</Text>

        <View style={styles.categoriesGrid}>
          {serviceCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: '#F7F7F7' }]}
              onPress={() => onSelect(category)}
              accessibilityRole="button"
              accessibilityLabel={`${category.name} service category`}
              accessibilityHint="Double tap to select this category"
            >
              <View style={[styles.categoryIcon, { backgroundColor: '#EBEBEB' }]}>
                <Ionicons
                  name={category.icon as keyof typeof Ionicons.glyphMap}
                  size={30}
                  color="#717171"
                />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  </View>
);
