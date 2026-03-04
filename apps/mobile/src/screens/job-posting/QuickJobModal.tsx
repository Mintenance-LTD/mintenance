/**
 * QuickJobModal - Where | When | What search bar popup
 *
 * Mirrors the web app's AirbnbSearchBar flow:
 * 1. WHERE - Pick a property
 * 2. WHEN  - Pick dates or urgency
 * 3. WHAT  - Pick job type
 * Then tap search → navigates to QuickJobPost screen
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import { theme } from '../../theme';
import type { Property } from '@mintenance/types';

// ============================================================================
// DATA
// ============================================================================

const JOB_CATEGORIES = [
  { id: 'plumbing', label: 'Plumbing', icon: 'water-outline' as const },
  { id: 'electrical', label: 'Electrical', icon: 'flash-outline' as const },
  { id: 'carpentry', label: 'Carpentry', icon: 'hammer-outline' as const },
  { id: 'painting', label: 'Painting', icon: 'color-palette-outline' as const },
  { id: 'roofing', label: 'Roofing', icon: 'home-outline' as const },
  { id: 'landscaping', label: 'Landscaping', icon: 'leaf-outline' as const },
  { id: 'hvac', label: 'HVAC', icon: 'snow-outline' as const },
  { id: 'general', label: 'General Repair', icon: 'construct-outline' as const },
] as const;

const URGENCY_OPTIONS = [
  { value: 'today', label: 'Today', color: '#FEE2E2', textColor: '#B91C1C' },
  { value: 'tomorrow', label: 'Tomorrow', color: '#FFEDD5', textColor: '#C2410C' },
  { value: 'this_week', label: 'This Week', color: '#FEF9C3', textColor: '#A16207' },
  { value: 'flexible', label: 'Flexible', color: '#DCFCE7', textColor: '#15803D' },
] as const;

type SearchSegment = 'where' | 'when' | 'what' | null;

interface QuickJobModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (params: {
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    category: string;
    urgency: string;
  }) => void;
}

export const QuickJobModal: React.FC<QuickJobModalProps> = ({
  visible,
  onClose,
  onSearch,
}) => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [activeSegment, setActiveSegment] = useState<SearchSegment>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState('flexible');
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: properties } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const res = await apiClient.get<{ properties: Property[] }>('/api/properties');
      return res.properties || [];
    },
    enabled: !!user && visible,
  });

  const handleClose = useCallback(() => {
    setActiveSegment(null);
    onClose();
  }, [onClose]);

  const handleReset = useCallback(() => {
    setSelectedProperty(null);
    setSelectedUrgency('flexible');
    setSelectedCategory('');
    setActiveSegment(null);
  }, []);

  const handlePropertySelect = useCallback((property: Property) => {
    setSelectedProperty(property);
    setActiveSegment('when');
  }, []);

  const handleUrgencySelect = useCallback((urgency: string) => {
    setSelectedUrgency(urgency);
    setActiveSegment('what');
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setActiveSegment(null);
  }, []);

  const handleSearch = useCallback(() => {
    if (!selectedProperty || !selectedCategory) return;
    onSearch({
      propertyId: selectedProperty.id,
      propertyName: selectedProperty.property_name || 'My Property',
      propertyAddress: selectedProperty.address || '',
      category: selectedCategory,
      urgency: selectedUrgency,
    });
    handleClose();
  }, [selectedProperty, selectedCategory, selectedUrgency, onSearch, handleClose]);

  const canSearch = !!selectedProperty && !!selectedCategory;

  const getCategoryLabel = () => {
    if (!selectedCategory) return 'Add job type';
    return JOB_CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory;
  };

  const getUrgencyLabel = () => {
    return URGENCY_OPTIONS.find((u) => u.value === selectedUrgency)?.label || 'Flexible';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />

          {/* Title */}
          <Text style={styles.title}>What maintenance do you need?</Text>

          {/* Step Progress Indicator */}
          <View style={styles.stepIndicator}>
            {(['where', 'when', 'what'] as const).map((step, index) => {
              const isCompleted = step === 'where' ? !!selectedProperty : step === 'when' ? selectedUrgency !== 'flexible' : !!selectedCategory;
              const isActive = activeSegment === step;
              return (
                <React.Fragment key={step}>
                  <View style={[styles.stepDot, isCompleted && styles.stepDotCompleted, isActive && styles.stepDotActive]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepDotText, isActive && styles.stepDotTextActive]}>{index + 1}</Text>
                    )}
                  </View>
                  {index < 2 && <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* Search Bar Segments */}
          <View style={styles.searchBar}>
            {/* WHERE */}
            <TouchableOpacity
              style={[styles.segment, activeSegment === 'where' && styles.segmentActive]}
              onPress={() => setActiveSegment(activeSegment === 'where' ? null : 'where')}
              activeOpacity={0.7}
            >
              <Text style={styles.segmentLabel}>Where</Text>
              <Text
                style={[styles.segmentValue, selectedProperty && styles.segmentValueFilled]}
                numberOfLines={1}
              >
                {selectedProperty?.property_name || 'Select property'}
              </Text>
            </TouchableOpacity>

            <View style={styles.segmentDivider} />

            {/* WHEN */}
            <TouchableOpacity
              style={[styles.segment, activeSegment === 'when' && styles.segmentActive]}
              onPress={() => setActiveSegment(activeSegment === 'when' ? null : 'when')}
              activeOpacity={0.7}
            >
              <Text style={styles.segmentLabel}>When</Text>
              <Text
                style={[styles.segmentValue, selectedUrgency !== 'flexible' && styles.segmentValueFilled]}
                numberOfLines={1}
              >
                {getUrgencyLabel()}
              </Text>
            </TouchableOpacity>

            <View style={styles.segmentDivider} />

            {/* WHAT */}
            <TouchableOpacity
              style={[styles.segment, activeSegment === 'what' && styles.segmentActive]}
              onPress={() => setActiveSegment(activeSegment === 'what' ? null : 'what')}
              activeOpacity={0.7}
            >
              <Text style={styles.segmentLabel}>What</Text>
              <Text
                style={[styles.segmentValue, selectedCategory && styles.segmentValueFilled]}
                numberOfLines={1}
              >
                {getCategoryLabel()}
              </Text>
            </TouchableOpacity>

            {/* Search button */}
            <TouchableOpacity
              style={[styles.searchButton, canSearch && styles.searchButtonActive]}
              onPress={handleSearch}
              disabled={!canSearch}
              accessibilityRole="button"
              accessibilityLabel="Search and create job"
            >
              <Ionicons
                name="search"
                size={20}
                color={canSearch ? '#FFFFFF' : theme.colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {/* Expanded panels */}
          <ScrollView style={styles.panelContainer} showsVerticalScrollIndicator={false}>
            {/* WHERE panel - Property picker */}
            {activeSegment === 'where' && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Select your property</Text>
                {properties && properties.length > 0 ? (
                  properties.map((property) => (
                    <TouchableOpacity
                      key={property.id}
                      style={[
                        styles.propertyCard,
                        selectedProperty?.id === property.id && styles.propertyCardActive,
                      ]}
                      onPress={() => handlePropertySelect(property)}
                    >
                      <View style={styles.propertyIcon}>
                        <Ionicons
                          name="home"
                          size={22}
                          color={selectedProperty?.id === property.id ? '#222222' : theme.colors.textSecondary}
                        />
                      </View>
                      <View style={styles.propertyInfo}>
                        <Text style={styles.propertyName}>{property.property_name || 'Unnamed'}</Text>
                        <Text style={styles.propertyAddress} numberOfLines={1}>
                          {property.address || 'No address'}
                        </Text>
                        {property.property_type && (
                          <Text style={styles.propertyType}>{property.property_type}</Text>
                        )}
                      </View>
                      {selectedProperty?.id === property.id && (
                        <Ionicons name="checkmark-circle" size={22} color='#222222' />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="home-outline" size={36} color={theme.colors.textTertiary} />
                    <Text style={styles.emptyText}>No properties yet</Text>
                    <Text style={styles.emptySubtext}>Add a property to start posting jobs</Text>
                    <TouchableOpacity
                      style={styles.addPropertyButton}
                      onPress={() => {
                        onClose();
                        setTimeout(() => {
                          navigation.navigate('ProfileTab', { screen: 'AddProperty' });
                        }, 300);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Add a property"
                    >
                      <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                      <Text style={styles.addPropertyText}>Add Property</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* WHEN panel - Urgency picker */}
            {activeSegment === 'when' && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>When do you need this done?</Text>
                <View style={styles.urgencyGrid}>
                  {URGENCY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.urgencyChip,
                        { backgroundColor: opt.color },
                        selectedUrgency === opt.value && styles.urgencyChipActive,
                      ]}
                      onPress={() => handleUrgencySelect(opt.value)}
                    >
                      <Text style={[styles.urgencyText, { color: opt.textColor }]}>
                        {opt.label}
                      </Text>
                      {selectedUrgency === opt.value && (
                        <Ionicons name="checkmark" size={16} color={opt.textColor} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* WHAT panel - Category picker */}
            {activeSegment === 'what' && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>What type of job do you need?</Text>
                <View style={styles.categoryGrid}>
                  {JOB_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryCard,
                        selectedCategory === cat.id && styles.categoryCardActive,
                      ]}
                      onPress={() => handleCategorySelect(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon as keyof typeof Ionicons.glyphMap}
                        size={28}
                        color={selectedCategory === cat.id ? '#222222' : theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.categoryLabel,
                          selectedCategory === cat.id && styles.categoryLabelActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedCategory && (
                  <TouchableOpacity style={styles.doneButton} onPress={() => setActiveSegment(null)}>
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerSearchButton, canSearch && styles.footerSearchButtonActive]}
              onPress={handleSearch}
              disabled={!canSearch}
            >
              <Ionicons name="search" size={18} color="#FFFFFF" />
              <Text style={styles.footerSearchText}>Search</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  // Step Progress
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 60,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: '#222222',
  },
  stepDotActive: {
    borderWidth: 2,
    borderColor: '#222222',
    backgroundColor: theme.colors.surface,
  },
  stepDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
  },
  stepDotTextActive: {
    color: '#222222',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 4,
  },
  stepLineCompleted: {
    backgroundColor: '#222222',
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: '#F0FDF4',
  },
  segmentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentValue: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  segmentValueFilled: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  segmentDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.borderLight,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchButtonActive: {
    backgroundColor: theme.colors.primary,
  },

  // Panels
  panelContainer: {
    maxHeight: 340,
    paddingHorizontal: 20,
  },
  panel: {
    paddingTop: 20,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },

  // Property cards
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
    gap: 12,
  },
  propertyCardActive: {
    borderColor: '#222222',
    backgroundColor: '#F7F7F7',
  },
  propertyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  propertyAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  propertyType: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  addPropertyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // Urgency chips
  urgencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  urgencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    minWidth: '46%',
    flex: 1,
  },
  urgencyChipActive: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  urgencyText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  categoryCardActive: {
    borderColor: '#222222',
    backgroundColor: '#F7F7F7',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    flex: 1,
  },
  categoryLabelActive: {
    color: '#222222',
    fontWeight: '700',
  },
  doneButton: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: 12,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  footerSearchButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  footerSearchText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
