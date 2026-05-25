/**
 * QuickJobModal - Where | When | What search bar popup
 *
 * Mirrors the web app AirbnbSearchBar flow:
 * 1. WHERE - Pick a property
 * 2. WHEN  - Pick dates or urgency
 * 3. WHAT  - Pick job type
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import {
  QuickJobModalProps,
  SearchSegment,
  URGENCY_OPTIONS,
  JOB_CATEGORIES,
  Property,
} from './QuickJobSteps/types';
import { WherePanel } from './QuickJobSteps/WherePanel';
import { WhenPanel } from './QuickJobSteps/WhenPanel';
import { WhatPanel } from './QuickJobSteps/WhatPanel';
import { me } from '../../design-system/mint-editorial';

export const QuickJobModal: React.FC<QuickJobModalProps> = ({
  visible,
  onClose,
  onSearch,
}) => {
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState<SearchSegment>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [selectedUrgency, setSelectedUrgency] = useState('flexible');
  const [selectedCategory, setSelectedCategory] = useState('');

  // 2026-05-26 audit-57 P2: previously direct-queried supabase with
  // `owner_id = user.id`, hiding shared properties that the user can
  // legitimately post jobs against (PropertyTeamService grants
  // create_job to manager and admin roles). Route through the
  // /api/properties endpoint with includeShared=create_job so
  // owner-rows + non-viewer team rows both surface. The endpoint
  // tags each row with `_role` for downstream UI hints — we don't
  // need that here since every returned row is one the user can
  // post against.
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['quick-job-properties', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await mobileApiClient.get<{ properties: Property[] }>(
        '/api/properties?includeShared=create_job'
      );
      const rows = res?.properties || [];
      // The API doesn't currently return property_name when reading
      // through the membership join — keep the alphabetic sort the
      // old query had so the WhereSelector list is deterministic.
      return [...rows].sort((a, b) =>
        (a.property_name || a.address || '').localeCompare(
          b.property_name || b.address || ''
        )
      );
    },
    enabled: !!user && visible,
    staleTime: 30000,
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
  }, [
    selectedProperty,
    selectedCategory,
    selectedUrgency,
    onSearch,
    handleClose,
  ]);

  const canSearch = !!selectedProperty && !!selectedCategory;
  const getCategoryLabel = () =>
    !selectedCategory
      ? 'Add job type'
      : JOB_CATEGORIES.find((c) => c.id === selectedCategory)?.label ||
        selectedCategory;
  const getUrgencyLabel = () =>
    URGENCY_OPTIONS.find((u) => u.value === selectedUrgency)?.label ||
    'Flexible';

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>What maintenance do you need?</Text>
          <View style={styles.stepIndicator}>
            {(['where', 'when', 'what'] as const).map((step, index) => {
              const isCompleted =
                step === 'where'
                  ? !!selectedProperty
                  : step === 'when'
                    ? selectedUrgency !== 'flexible'
                    : !!selectedCategory;
              const isActive = activeSegment === step;
              return (
                <React.Fragment key={step}>
                  <View
                    style={[
                      styles.stepDot,
                      isCompleted && styles.stepDotCompleted,
                      isActive && styles.stepDotActive,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name='checkmark' size={10} color={me.onBrand} />
                    ) : (
                      <Text
                        style={[
                          styles.stepDotText,
                          isActive && styles.stepDotTextActive,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  {index < 2 && (
                    <View
                      style={[
                        styles.stepLine,
                        isCompleted && styles.stepLineCompleted,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          <View style={styles.searchBar}>
            <TouchableOpacity
              style={[
                styles.segment,
                activeSegment === 'where' && styles.segmentActive,
              ]}
              onPress={() =>
                setActiveSegment(activeSegment === 'where' ? null : 'where')
              }
              activeOpacity={0.7}
            >
              <Text style={styles.segmentLabel}>Where</Text>
              <Text
                style={[
                  styles.segmentValue,
                  selectedProperty && styles.segmentValueFilled,
                ]}
                numberOfLines={1}
              >
                {selectedProperty?.property_name || 'Select property'}
              </Text>
            </TouchableOpacity>
            <View style={styles.segmentDivider} />
            <TouchableOpacity
              style={[
                styles.segment,
                activeSegment === 'when' && styles.segmentActive,
              ]}
              onPress={() =>
                setActiveSegment(activeSegment === 'when' ? null : 'when')
              }
              activeOpacity={0.7}
            >
              <Text style={styles.segmentLabel}>When</Text>
              <Text
                style={[
                  styles.segmentValue,
                  selectedUrgency !== 'flexible' && styles.segmentValueFilled,
                ]}
                numberOfLines={1}
              >
                {getUrgencyLabel()}
              </Text>
            </TouchableOpacity>
            <View style={styles.segmentDivider} />
            <TouchableOpacity
              style={[
                styles.segment,
                activeSegment === 'what' && styles.segmentActive,
              ]}
              onPress={() =>
                setActiveSegment(activeSegment === 'what' ? null : 'what')
              }
              activeOpacity={0.7}
            >
              <Text style={styles.segmentLabel}>What</Text>
              <Text
                style={[
                  styles.segmentValue,
                  selectedCategory && styles.segmentValueFilled,
                ]}
                numberOfLines={1}
              >
                {getCategoryLabel()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.searchButton,
                canSearch && styles.searchButtonActive,
              ]}
              onPress={handleSearch}
              disabled={!canSearch}
              accessibilityRole='button'
              accessibilityLabel='Search and create job'
            >
              <Ionicons
                name='search'
                size={20}
                color={canSearch ? me.onBrand : me.ink3}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.panelContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeSegment === 'where' && (
              <WherePanel
                properties={properties}
                selectedProperty={selectedProperty}
                onSelect={handlePropertySelect}
                onClose={onClose}
              />
            )}
            {activeSegment === 'when' && (
              <WhenPanel
                selectedUrgency={selectedUrgency}
                onSelect={handleUrgencySelect}
              />
            )}
            {activeSegment === 'what' && (
              <WhatPanel
                selectedCategory={selectedCategory}
                onSelect={handleCategorySelect}
                onDone={() => setActiveSegment(null)}
              />
            )}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerSearchButton,
                canSearch && styles.footerSearchButtonActive,
              ]}
              onPress={handleSearch}
              disabled={!canSearch}
            >
              <Ionicons name='search' size={18} color={me.onBrand} />
              <Text style={styles.footerSearchText}>Search</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: me.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: me.line,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: me.ink,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
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
    backgroundColor: me.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: { backgroundColor: me.brand },
  stepDotActive: {
    borderWidth: 2,
    borderColor: me.brand,
    backgroundColor: me.surface,
  },
  stepDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: me.ink3,
  },
  stepDotTextActive: { color: me.brand },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: me.line,
    marginHorizontal: 4,
  },
  stepLineCompleted: { backgroundColor: me.brand },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: me.bg2,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 10,
  },
  segmentActive: { backgroundColor: 'rgba(16,185,129,0.08)' },
  segmentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: me.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentValue: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 1,
  },
  segmentValueFilled: { color: me.ink, fontWeight: '600' },
  segmentDivider: {
    width: 1,
    height: 28,
    backgroundColor: me.line,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchButtonActive: { backgroundColor: me.brand },
  panelContainer: { maxHeight: 340, paddingHorizontal: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    marginTop: 12,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink2,
    textDecorationLine: 'underline',
  },
  footerSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.line,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  footerSearchButtonActive: { backgroundColor: me.brand },
  footerSearchText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },
});
