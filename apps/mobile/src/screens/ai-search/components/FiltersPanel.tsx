import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { SearchFilters } from '../../../services/AISearchService';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

const CATEGORIES = [
  'plumbing',
  'electrical',
  'heating',
  'hvac',
  'general',
  'handyman',
  'appliance',
  'landscaping',
  'gardening',
  'roofing',
  'painting',
  'carpentry',
  'cleaning',
  'flooring',
  'tiling',
  'plastering',
  'guttering',
  'fencing',
  'damp',
  'pest_control',
  'other',
];

export function FiltersPanel({
  filters,
  onApply,
}: {
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}) {
  const [category, setCategory] = useState(filters.category ?? '');
  const [location, setLocation] = useState(filters.location ?? '');
  return (
    <View style={styles.filtersContainer}>
      <Text style={styles.filterLabel}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: 12 }}
      >
        {['', ...CATEGORIES].map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => setCategory(value)}
            accessibilityRole='radio'
            accessibilityState={{ checked: category === value }}
            accessibilityLabel={
              value ? value.replace('_', ' ') : 'All categories'
            }
            style={[
              styles.filterValue,
              { minHeight: 44, marginRight: 8 },
              category === value && { backgroundColor: me.brand },
            ]}
          >
            <Text
              style={[
                styles.filterValueText,
                category === value && { color: me.onBrand },
              ]}
            >
              {value ? value.replace('_', ' ') : 'All categories'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.filterLabel}>Location</Text>
      <TextInput
        accessibilityLabel='Search location'
        placeholder='Town or postcode'
        placeholderTextColor={me.ink3}
        value={location}
        onChangeText={setLocation}
        maxLength={100}
        returnKeyType='done'
        style={[
          styles.filterValue,
          { color: me.ink, minHeight: 44, borderRadius: 8, marginVertical: 12 },
        ]}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity
          style={styles.clearFiltersButton}
          accessibilityRole='button'
          accessibilityLabel='Clear all search filters'
          onPress={() => {
            setCategory('');
            setLocation('');
            onApply({});
          }}
        >
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterValue,
            { minHeight: 44, backgroundColor: me.brand },
          ]}
          accessibilityRole='button'
          accessibilityLabel='Apply search filters'
          onPress={() =>
            onApply({
              ...filters,
              category: category || undefined,
              location: location.trim() || undefined,
            })
          }
        >
          <Text style={{ color: me.onBrand, fontWeight: '600' }}>
            Apply filters
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
