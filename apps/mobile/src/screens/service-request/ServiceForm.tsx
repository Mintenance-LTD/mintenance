import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Property } from '@mintenance/types';
import { styles } from './styles';
import { type ServiceCategory, priorityLevels } from './types';
import { DatePicker } from '../../components/ui/DatePicker';
import { me } from '../../design-system/mint-editorial';

interface ServiceFormProps {
  category: ServiceCategory;
  selectedSubcategory: string;
  title: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high';
  photos: string[];
  loading: boolean;
  selectedProperty: Property | null;
  properties: Property[] | undefined;
  headerPaddingTop: number;
  onBack: () => void;
  onSubcategorySelect: (sub: string) => void;
  onPropertySelect: (prop: Property) => void;
  onAddProperty: () => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  preferredDate?: Date | null;
  onPreferredDateChange?: (date: Date) => void;
  onPriorityChange: (v: 'low' | 'medium' | 'high') => void;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onSubmit: () => void;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({
  category,
  selectedSubcategory,
  title,
  description,
  location,
  priority,
  photos,
  loading,
  selectedProperty,
  properties,
  headerPaddingTop,
  onBack,
  onSubcategorySelect,
  onPropertySelect,
  onAddProperty,
  onTitleChange,
  onDescriptionChange,
  onLocationChange,
  preferredDate,
  onPreferredDateChange,
  onPriorityChange,
  onAddPhoto,
  onRemovePhoto,
  onSubmit,
}) => (
  <View style={styles.container}>
    <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole='button'
        accessibilityLabel='Go back to category selection'
      >
        <Ionicons name='arrow-back' size={24} color={me.ink} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} accessibilityRole='header'>
        {category.name} Service
      </Text>
      <View style={styles.placeholder} />
    </View>

    <ScrollView style={styles.content}>
      {/* Subcategory */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          What specific service do you need?
        </Text>
        <View style={styles.subcategoriesContainer}>
          {category.subcategories.map((sub) => (
            <TouchableOpacity
              key={sub}
              style={[
                styles.subcategoryChip,
                selectedSubcategory === sub && {
                  backgroundColor: me.ink,
                },
              ]}
              onPress={() => onSubcategorySelect(sub)}
              accessibilityRole='radio'
              accessibilityLabel={sub}
              accessibilityState={{ selected: selectedSubcategory === sub }}
            >
              <Text
                style={[
                  styles.subcategoryText,
                  selectedSubcategory === sub && styles.subcategoryTextSelected,
                ]}
              >
                {sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Property */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Which property?</Text>
        <Text style={styles.sectionSubtitle}>
          Select the property for this service request
        </Text>
        {properties && properties.length > 0 ? (
          <View>
            {properties.map((property) => (
              <TouchableOpacity
                key={property.id}
                style={[
                  styles.propertyOption,
                  selectedProperty?.id === property.id &&
                    styles.propertyOptionSelected,
                ]}
                onPress={() => onPropertySelect(property)}
                accessibilityRole='radio'
                accessibilityLabel={`${property.property_name}, ${property.address}`}
                accessibilityState={{
                  selected: selectedProperty?.id === property.id,
                }}
              >
                <View style={styles.propertyOptionContent}>
                  <Ionicons
                    name='home-outline'
                    size={20}
                    color={
                      selectedProperty?.id === property.id ? me.ink : me.ink2
                    }
                  />
                  <View style={styles.propertyOptionText}>
                    <Text
                      style={[
                        styles.propertyAddress,
                        selectedProperty?.id === property.id &&
                          styles.propertyAddressSelected,
                      ]}
                    >
                      {property.property_name}
                    </Text>
                    <Text style={styles.propertyLocation} numberOfLines={2}>
                      {property.address}
                    </Text>
                  </View>
                  {selectedProperty?.id === property.id && (
                    <Ionicons
                      name='checkmark-circle'
                      size={22}
                      color={me.ink}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addPropertyInline}
            onPress={onAddProperty}
            accessibilityRole='button'
            accessibilityLabel='Add your first property'
          >
            <Ionicons name='add-circle' size={22} color={me.ink2} />
            <Text style={styles.addPropertyInlineText}>
              Add Your First Property
            </Text>
            <Ionicons name='chevron-forward' size={18} color={me.ink3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Job Details */}
      <View style={styles.section}>
        <Text style={styles.label}>Service Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={onTitleChange}
          placeholder='e.g., Fix Leaking Kitchen Faucet'
          placeholderTextColor={me.ink3}
        />
        <Text style={styles.label}>Problem Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder='Describe the problem in detail...'
          placeholderTextColor={me.ink3}
          multiline
          numberOfLines={4}
          textAlignVertical='top'
        />
        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={onLocationChange}
          placeholder='Your address or area'
          placeholderTextColor={me.ink3}
        />
        {onPreferredDateChange && (
          <DatePicker
            label='Preferred Date'
            value={preferredDate ?? null}
            onChange={onPreferredDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Priority */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Priority Level</Text>
        <View style={styles.priorityContainer}>
          {priorityLevels.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.priorityCard,
                priority === level.id && { backgroundColor: me.ink },
              ]}
              onPress={() => onPriorityChange(level.id)}
              accessibilityRole='radio'
              accessibilityLabel={`${level.name} priority: ${level.description}`}
              accessibilityState={{ selected: priority === level.id }}
            >
              <Text
                style={[
                  styles.priorityName,
                  { color: priority === level.id ? me.onBrand : me.ink },
                ]}
              >
                {level.name}
              </Text>
              <Text
                style={[
                  styles.priorityDescription,
                  { color: priority === level.id ? me.onBrand : me.ink2 },
                ]}
              >
                {level.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos (Optional)</Text>
        <Text style={styles.sectionSubtitle}>
          Add photos to help contractors understand the problem better
        </Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoSlot}>
              <Image source={{ uri: photo }} style={styles.photoImage} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => onRemovePhoto(index)}
                accessibilityRole='button'
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <Ionicons name='close-circle' size={24} color={me.errFg} />
              </TouchableOpacity>
            </View>
          ))}
          {Array.from({ length: Math.min(4 - photos.length, 4) }).map(
            (_, idx) => (
              <TouchableOpacity
                key={`empty-${idx}`}
                style={styles.photoSlotEmpty}
                onPress={onAddPhoto}
                accessibilityRole='button'
                accessibilityLabel='Add photo'
                accessibilityHint='Double tap to take or choose a photo of the problem'
              >
                <Ionicons name='camera-outline' size={28} color={me.ink3} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </ScrollView>

    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={onSubmit}
        disabled={loading}
        accessibilityRole='button'
        accessibilityLabel={
          loading ? 'Posting service request' : 'Submit service request'
        }
        accessibilityState={{ disabled: loading }}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Posting...' : 'Request Service'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);
