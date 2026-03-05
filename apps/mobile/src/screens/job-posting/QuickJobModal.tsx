/**
 * QuickJobModal - Where | When | What search bar popup
 *
 * Mirrors the web app AirbnbSearchBar flow:
 * 1. WHERE - Pick a property
 * 2. WHEN  - Pick dates or urgency
 * 3. WHAT  - Pick job type
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import { theme } from '../../theme';
import { QuickJobModalProps, SearchSegment, URGENCY_OPTIONS, JOB_CATEGORIES, Property } from './QuickJobSteps/types';
import { WherePanel } from './QuickJobSteps/WherePanel';
import { WhenPanel } from './QuickJobSteps/WhenPanel';
import { WhatPanel } from './QuickJobSteps/WhatPanel';

export const QuickJobModal: React.FC<QuickJobModalProps> = ({ visible, onClose, onSearch }) => {
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState<SearchSegment>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState(String.fromCharCode(39)+String.fromCharCode(39));
  const [selectedCategory, setSelectedCategory] = useState(String.fromCharCode(39)+String.fromCharCode(39));

  const { data: properties } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const res = await apiClient.get<{ properties: Property[] }>('/api/properties');
      return res.properties || [];
    },
    enabled: !!user && visible,
  });

  const handleClose = useCallback(() => { setActiveSegment(null); onClose(); }, [onClose]);
  const handleReset = useCallback(() => { setSelectedProperty(null); setSelectedUrgency('flexible'); setSelectedCategory(''); setActiveSegment(null); }, []);

  const handlePropertySelect = useCallback((property: Property) => { setSelectedProperty(property); setActiveSegment('when'); }, []);
  const handleUrgencySelect = useCallback((urgency: string) => { setSelectedUrgency(urgency); setActiveSegment('what'); }, []);
  const handleCategorySelect = useCallback((categoryId: string) => { setSelectedCategory(categoryId); setActiveSegment(null); }, []);

  const handleSearch = useCallback(() => {
    if (!selectedProperty || !selectedCategory) return;
    onSearch({ propertyId: selectedProperty.id, propertyName: selectedProperty.property_name || 'My Property', propertyAddress: selectedProperty.address || '', category: selectedCategory, urgency: selectedUrgency });
    handleClose();
  }, [selectedProperty, selectedCategory, selectedUrgency, onSearch, handleClose]);

  const canSearch = !!selectedProperty && !!selectedCategory;
  const getCategoryLabel = () => !selectedCategory ? 'Add job type' : JOB_CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory;
  const getUrgencyLabel = () => URGENCY_OPTIONS.find((u) => u.value === selectedUrgency)?.label || 'Flexible';

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>What maintenance do you need?</Text>
          <View style={styles.stepIndicator}>
            {(['where', 'when', 'what'] as const).map((step, index) => {
              const isCompleted = step === 'where' ? !!selectedProperty : step === 'when' ? selectedUrgency !== 'flexible' : !!selectedCategory;
              const isActive = activeSegment === step;
              return (
                <React.Fragment key={step}>
                  <View style={[styles.stepDot, isCompleted && styles.stepDotCompleted, isActive && styles.stepDotActive]}>
                    {isCompleted ? (
                      <Ionicons name='checkmark' size={10} color='#FFFFFF' />
                    ) : (
                      <Text style={[styles.stepDotText, isActive && styles.stepDotTextActive]}>{index + 1}</Text>
                    )}
                  </View>
                  {index < 2 && <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />}
                </React.Fragment>
              );
            })}
          </View>
          <View style={styles.searchBar}>
            <TouchableOpacity style={[styles.segment, activeSegment === 'where' && styles.segmentActive]} onPress={() => setActiveSegment(activeSegment === 'where' ? null : 'where')} activeOpacity={0.7}>
              <Text style={styles.segmentLabel}>Where</Text>
              <Text style={[styles.segmentValue, selectedProperty && styles.segmentValueFilled]} numberOfLines={1}>
                {selectedProperty?.property_name || 'Select property'}
              </Text>
            </TouchableOpacity>
            <View style={styles.segmentDivider} />
            <TouchableOpacity style={[styles.segment, activeSegment === 'when' && styles.segmentActive]} onPress={() => setActiveSegment(activeSegment === 'when' ? null : 'when')} activeOpacity={0.7}>
              <Text style={styles.segmentLabel}>When</Text>
              <Text style={[styles.segmentValue, selectedUrgency !== 'flexible' && styles.segmentValueFilled]} numberOfLines={1}>
                {getUrgencyLabel()}
              </Text>
            </TouchableOpacity>
            <View style={styles.segmentDivider} />
            <TouchableOpacity style={[styles.segment, activeSegment === 'what' && styles.segmentActive]} onPress={() => setActiveSegment(activeSegment === 'what' ? null : 'what')} activeOpacity={0.7}>
              <Text style={styles.segmentLabel}>What</Text>
              <Text style={[styles.segmentValue, selectedCategory && styles.segmentValueFilled]} numberOfLines={1}>
                {getCategoryLabel()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.searchButton, canSearch && styles.searchButtonActive]} onPress={handleSearch} disabled={!canSearch} accessibilityRole='button' accessibilityLabel='Search and create job'>
              <Ionicons name='search' size={20} color={canSearch ? '#FFFFFF' : '#9CA3AF'} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.panelContainer} showsVerticalScrollIndicator={false}>
            {activeSegment === 'where' && (
              <WherePanel properties={properties} selectedProperty={selectedProperty} onSelect={handlePropertySelect} onClose={onClose} />
            )}
            {activeSegment === 'when' && (
              <WhenPanel selectedUrgency={selectedUrgency} onSelect={handleUrgencySelect} />
            )}
            {activeSegment === 'what' && (
              <WhatPanel selectedCategory={selectedCategory} onSelect={handleCategorySelect} onDone={() => setActiveSegment(null)} />
            )}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerSearchButton, canSearch && styles.footerSearchButtonActive]} onPress={handleSearch} disabled={!canSearch}>
              <Ionicons name='search' size={18} color='#FFFFFF' />
              <Text style={styles.footerSearchText}>Search</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  handle: { width: 36, height: 4, backgroundColor: theme.colors.borderLight, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, paddingHorizontal: 60 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  stepDotCompleted: { backgroundColor: '#222222' },
  stepDotActive: { borderWidth: 2, borderColor: '#222222', backgroundColor: theme.colors.surface },
  stepDotText: { fontSize: 10, fontWeight: '700', color: theme.colors.textTertiary },
  stepDotTextActive: { color: '#222222' },
  stepLine: { flex: 1, height: 2, backgroundColor: theme.colors.borderLight, marginHorizontal: 4 },
  stepLineCompleted: { backgroundColor: '#222222' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: theme.colors.background, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10, paddingHorizontal: 12 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 10 },
  segmentActive: { backgroundColor: '#F0FDF4' },
  segmentLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
  segmentValue: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 1 },
  segmentValueFilled: { color: theme.colors.textPrimary, fontWeight: '600' },
  segmentDivider: { width: 1, height: 28, backgroundColor: theme.colors.borderLight },
  searchButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.borderLight, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  searchButtonActive: { backgroundColor: theme.colors.primary },
  panelContainer: { maxHeight: 340, paddingHorizontal: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.borderLight, marginTop: 12 },
  clearText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary, textDecorationLine: 'underline' },
  footerSearchButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.borderLight, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8 },
  footerSearchButtonActive: { backgroundColor: theme.colors.primary },
  footerSearchText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});