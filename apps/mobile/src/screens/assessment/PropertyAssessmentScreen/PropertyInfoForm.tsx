import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../../theme';
import { PropertyInfo, PROPERTY_TYPES } from './constants';
import { styles } from './styles';

interface Props {
  propertyInfo: PropertyInfo;
  setPropertyInfo: React.Dispatch<React.SetStateAction<PropertyInfo>>;
  onSave: () => void;
}

export const PropertyInfoForm: React.FC<Props> = ({
  propertyInfo,
  setPropertyInfo,
  onSave,
}) => (
  <View style={styles.formSection}>
    <Text style={styles.sectionTitle}>Property Information</Text>

    <Text style={styles.fieldLabel}>Property Type *</Text>
    <View style={styles.chipRow}>
      {PROPERTY_TYPES.map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.chip,
            propertyInfo.propertyType === type && styles.chipSelected,
          ]}
          onPress={() =>
            setPropertyInfo((prev) => ({ ...prev, propertyType: type }))
          }
        >
          <Text
            style={[
              styles.chipText,
              propertyInfo.propertyType === type && styles.chipTextSelected,
            ]}
          >
            {type}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.fieldLabel}>Number of Bedrooms</Text>
    <TextInput
      style={styles.input}
      value={propertyInfo.bedrooms}
      onChangeText={(t) =>
        setPropertyInfo((prev) => ({ ...prev, bedrooms: t }))
      }
      placeholder="e.g. 3"
      placeholderTextColor={theme.colors.textTertiary}
      keyboardType="number-pad"
    />

    <Text style={styles.fieldLabel}>Year Built (approx)</Text>
    <TextInput
      style={styles.input}
      value={propertyInfo.yearBuilt}
      onChangeText={(t) =>
        setPropertyInfo((prev) => ({ ...prev, yearBuilt: t }))
      }
      placeholder="e.g. 1985"
      placeholderTextColor={theme.colors.textTertiary}
      keyboardType="number-pad"
    />

    <Text style={styles.fieldLabel}>Brief Description</Text>
    <TextInput
      style={[styles.input, { minHeight: 80 }]}
      value={propertyInfo.description}
      onChangeText={(t) =>
        setPropertyInfo((prev) => ({ ...prev, description: t }))
      }
      placeholder="Describe the property and any known issues..."
      placeholderTextColor={theme.colors.textTertiary}
      multiline
      textAlignVertical="top"
    />

    <TouchableOpacity style={styles.saveFormButton} onPress={onSave}>
      <Icon name="check" size={18} color="#fff" />
      <Text style={styles.saveFormButtonText}>Save Property Info</Text>
    </TouchableOpacity>
  </View>
);
