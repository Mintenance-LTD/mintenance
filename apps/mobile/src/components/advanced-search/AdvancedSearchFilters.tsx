import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Temporary mock for Slider until @react-native-community/slider is installed
const Slider = ({ value, onValueChange, minimumValue, maximumValue, style, ...props }: any) => (
  <View style={[{ height: 40, backgroundColor: '#ccc', borderRadius: 4 }, style]} {...props}>
    <Text style={{ fontSize: 12, textAlign: 'center', paddingTop: 10 }}>
      {value ? Math.round(value) : minimumValue || 0}
    </Text>
  </View>
);

import { theme } from '../../theme';
import { useI18n } from '../../hooks/useI18n';
import { useHaptics } from '../../utils/haptics';
import { SearchFilters, PriceRange, LocationRadius, ProjectType } from '../../types/search';

interface AdvancedSearchFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
  loading?: boolean;
}

const { height: screenHeight } = Dimensions.get('window');

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  visible,
  onClose,
  onApplyFilters,
  initialFilters = {},
  loading = false,
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    location: {
      radius: initialFilters.location?.radius || 25,
      unit: initialFilters.location?.unit || 'miles',
      coordinates: initialFilters.location?.coordinates || null,
    },
    priceRange: {
      min: initialFilters.priceRange?.min || 50,
      max: initialFilters.priceRange?.max || 500,
      hourly: initialFilters.priceRange?.hourly || true,
    },
    skills: initialFilters.skills || [],
    rating: initialFilters.rating || 0,
    availability: initialFilters.availability || 'this_month',
    projectType: initialFilters.projectType || [],
    sortBy: initialFilters.sortBy || 'relevance',
    verified: initialFilters.verified || false,
    hasReviews: initialFilters.hasReviews || false,
  });

  const { t } = useI18n();
  const haptics = useHaptics();

  // Available options
  const skillOptions = [
    'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Painting',
    'Flooring', 'Kitchen Renovation', 'Bathroom Renovation',
    'Landscaping', 'Fencing', 'Drywall', 'Tile Work',
    'Windows', 'Doors', 'Insulation', 'Cleaning',
  ];

  const projectTypes: ProjectType[] = [
    'emergency', 'maintenance', 'installation', 'repair',
    'renovation', 'inspection', 'consultation', 'other',
  ];

  const availabilityOptions = [
    { value: 'immediate', label: 'Immediate (Today)' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
  ] as const;

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'distance', label: 'Nearest First' },
    { value: 'reviews', label: 'Most Reviews' },
  ] as const;

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    haptics.selection();
  }, [haptics]);

  const toggleSkill = useCallback((skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
    haptics.light();
  }, [haptics]);

  const toggleProjectType = useCallback((type: ProjectType) => {
    setFilters((prev) => ({
      ...prev,
      projectType: prev.projectType.includes(type)
        ? prev.projectType.filter((t) => t !== type)
        : [...prev.projectType, type],
    }));
    haptics.light();
  }, [haptics]);

  const resetFilters = useCallback(() => {
    setFilters({
      location: { radius: 25, unit: 'miles', coordinates: null },
      priceRange: { min: 50, max: 500, hourly: true },
      skills: [],
      rating: 0,
      availability: 'this_month',
      projectType: [],
      sortBy: 'relevance',
      verified: false,
      hasReviews: false,
    });
    haptics.medium();
  }, [haptics]);

  const handleApplyFilters = useCallback(() => {
    onApplyFilters(filters);
    haptics.success();
    onClose();
  }, [filters, onApplyFilters, onClose, haptics]);

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <TouchableOpacity
        key={i}
        onPress={() => updateFilter('rating', i + 1 === filters.rating ? 0 : i + 1)}
        style={styles.starButton}
      >
        <Ionicons
          name={i < rating ? 'star' : 'star-outline'}
          size={24}
          color={i < rating ? theme.colors.warning : theme.colors.textTertiary}
        />
      </TouchableOpacity>
    ));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.skills.length > 0) count++;
    if (filters.rating > 0) count++;
    if (filters.availability !== 'this_month') count++;
    if (filters.projectType.length > 0) count++;
    if (filters.verified) count++;
    if (filters.hasReviews) count++;
    if (filters.priceRange.min > 50 || filters.priceRange.max < 500) count++;
    if (filters.location.radius !== 25) count++;
    return count;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Filters</Text>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Location Radius */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Radius</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                {filters.location.radius} {filters.location.unit}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={100}
                value={filters.location.radius}
                onValueChange={(value) =>
                  updateFilter('location', {
                    ...filters.location,
                    radius: Math.round(value),
                  })
                }
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.surfaceSecondary}
                thumbStyle={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>5 mi</Text>
                <Text style={styles.sliderLabelText}>100 mi</Text>
              </View>
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Price Range ({filters.priceRange.hourly ? 'per hour' : 'per project'})
            </Text>
            <View style={styles.priceContainer}>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Min:</Text>
                <TextInput
                  style={styles.priceInput}
                  value={`$${filters.priceRange.min}`}
                  onChangeText={(text) => {
                    const value = parseInt(text.replace('$', '')) || 0;
                    updateFilter('priceRange', {
                      ...filters.priceRange,
                      min: value,
                    });
                  }}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Max:</Text>
                <TextInput
                  style={styles.priceInput}
                  value={`$${filters.priceRange.max}`}
                  onChangeText={(text) => {
                    const value = parseInt(text.replace('$', '')) || 0;
                    updateFilter('priceRange', {
                      ...filters.priceRange,
                      max: value,
                    });
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Hourly Rate</Text>
              <Switch
                value={filters.priceRange.hourly}
                onValueChange={(value) =>
                  updateFilter('priceRange', {
                    ...filters.priceRange,
                    hourly: value,
                  })
                }
                trackColor={{
                  false: theme.colors.surfaceSecondary,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
              />
            </View>
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Skills ({filters.skills.length} selected)
            </Text>
            <View style={styles.skillsContainer}>
              {skillOptions.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.skillChip,
                    filters.skills.includes(skill) && styles.skillChipSelected,
                  ]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text
                    style={[
                      styles.skillChipText,
                      filters.skills.includes(skill) &&
                        styles.skillChipTextSelected,
                    ]}
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Project Types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Project Types ({filters.projectType.length} selected)
            </Text>
            <View style={styles.skillsContainer}>
              {projectTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.skillChip,
                    filters.projectType.includes(type) && styles.skillChipSelected,
                  ]}
                  onPress={() => toggleProjectType(type)}
                >
                  <Text
                    style={[
                      styles.skillChipText,
                      filters.projectType.includes(type) &&
                        styles.skillChipTextSelected,
                    ]}
                  >
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Minimum Rating</Text>
            <View style={styles.ratingContainer}>
              {getRatingStars(filters.rating)}
              <Text style={styles.ratingText}>
                {filters.rating > 0 ? `${filters.rating}+ stars` : 'Any rating'}
              </Text>
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            {availabilityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.radioOption,
                  filters.availability === option.value && styles.radioOptionSelected,
                ]}
                onPress={() => updateFilter('availability', option.value)}
              >
                <View style={styles.radioCircle}>
                  {filters.availability === option.value && (
                    <View style={styles.radioCircleSelected} />
                  )}
                </View>
                <Text style={styles.radioText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort By */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.radioOption,
                  filters.sortBy === option.value && styles.radioOptionSelected,
                ]}
                onPress={() => updateFilter('sortBy', option.value)}
              >
                <View style={styles.radioCircle}>
                  {filters.sortBy === option.value && (
                    <View style={styles.radioCircleSelected} />
                  )}
                </View>
                <Text style={styles.radioText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Additional Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Filters</Text>

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Verified Contractors Only</Text>
              <Switch
                value={filters.verified}
                onValueChange={(value) => updateFilter('verified', value)}
                trackColor={{
                  false: theme.colors.surfaceSecondary,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
              />
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Must Have Reviews</Text>
              <Switch
                value={filters.hasReviews}
                onValueChange={(value) => updateFilter('hasReviews', value)}
                trackColor={{
                  false: theme.colors.surfaceSecondary,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>
              {getActiveFiltersCount()} filters applied
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.applyButton, loading && styles.applyButtonDisabled]}
            onPress={handleApplyFilters}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.surface} size="small" />
            ) : (
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  resetButton: {
    padding: 8,
  },
  resetText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  sliderContainer: {
    marginTop: 8,
  },
  sliderLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabelText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceInputContainer: {
    flex: 0.45,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  skillChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  skillChipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  skillChipTextSelected: {
    color: theme.colors.surface,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  radioOptionSelected: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  radioText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  footerInfo: {
    flex: 1,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.surface,
  },
});

export default AdvancedSearchFilters;