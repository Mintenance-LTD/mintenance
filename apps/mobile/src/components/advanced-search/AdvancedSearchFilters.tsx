import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { styles } from './advancedSearchFiltersStyles';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../theme';
import { useI18n } from '../../hooks/useI18n';
import { useHaptics } from '../../utils/haptics';
import { SearchFilters, PriceRange, LocationRadius, ProjectType } from '../../types/search';

// Temporary mock for Slider until @react-native-community/slider is installed
interface SliderProps {
  value?: number;
  onValueChange?: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  style?: import('react-native').ViewStyle;
}

const Slider: React.FC<SliderProps> = ({ value, onValueChange, minimumValue, maximumValue, style, ...props }) => (
  <View style={[{ height: 40, backgroundColor: '#ccc', borderRadius: 4 }, style]} {...props}>
    <Text style={{ fontSize: 12, textAlign: 'center', paddingTop: 10 }}>
      {value ? Math.round(value) : minimumValue || 0}
    </Text>
  </View>
);

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

  const updateFilter = useCallback((key: keyof SearchFilters, value: SearchFilters[typeof key]) => {
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

export default AdvancedSearchFilters;