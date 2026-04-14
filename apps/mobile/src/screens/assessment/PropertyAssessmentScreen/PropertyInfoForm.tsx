import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../../theme';
import {
  PropertyInfo,
  PROPERTY_TYPES,
  ROOM_OPTIONS,
  RoomMetadata,
} from './constants';
import { styles } from './styles';

interface Props {
  propertyInfo: PropertyInfo;
  setPropertyInfo: React.Dispatch<React.SetStateAction<PropertyInfo>>;
  roomMetadata?: RoomMetadata;
  setRoomMetadata?: React.Dispatch<React.SetStateAction<RoomMetadata>>;
  onSave: () => void;
}

export const PropertyInfoForm: React.FC<Props> = ({
  propertyInfo,
  setPropertyInfo,
  roomMetadata,
  setRoomMetadata,
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
      placeholder='e.g. 3'
      placeholderTextColor={theme.colors.textTertiary}
      keyboardType='number-pad'
    />

    <Text style={styles.fieldLabel}>Year Built (approx)</Text>
    <TextInput
      style={styles.input}
      value={propertyInfo.yearBuilt}
      onChangeText={(t) =>
        setPropertyInfo((prev) => ({ ...prev, yearBuilt: t }))
      }
      placeholder='e.g. 1985'
      placeholderTextColor={theme.colors.textTertiary}
      keyboardType='number-pad'
    />

    <Text style={styles.fieldLabel}>Brief Description</Text>
    <TextInput
      style={[styles.input, { minHeight: 80 }]}
      value={propertyInfo.description}
      onChangeText={(t) =>
        setPropertyInfo((prev) => ({ ...prev, description: t }))
      }
      placeholder='Describe the property and any known issues...'
      placeholderTextColor={theme.colors.textTertiary}
      multiline
      textAlignVertical='top'
    />

    {/* Room metadata (optional) — improves AI accuracy with location context */}
    {setRoomMetadata && (
      <>
        <Text style={styles.fieldLabel}>Room or Area (optional)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        >
          <View style={styles.chipRow}>
            {ROOM_OPTIONS.map((room) => (
              <TouchableOpacity
                key={room}
                style={[
                  styles.chip,
                  roomMetadata?.room === room && styles.chipSelected,
                ]}
                onPress={() =>
                  setRoomMetadata((prev) => ({
                    ...prev,
                    room: prev.room === room ? undefined : room,
                  }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    roomMetadata?.room === room && styles.chipTextSelected,
                  ]}
                >
                  {room}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.fieldLabel}>Floor (optional)</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            style={[styles.chip, { minWidth: 44, alignItems: 'center' }]}
            onPress={() =>
              setRoomMetadata((prev) => ({
                ...prev,
                floor: Math.max(-1, (prev.floor ?? 0) - 1),
              }))
            }
          >
            <Text style={styles.chipText}>−</Text>
          </TouchableOpacity>
          <Text
            style={[
              styles.chipText,
              {
                minWidth: 60,
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '600',
              },
            ]}
          >
            {roomMetadata?.floor != null
              ? roomMetadata.floor === 0
                ? 'Ground'
                : roomMetadata.floor === -1
                  ? 'Basement'
                  : `Floor ${roomMetadata.floor}`
              : 'Not set'}
          </Text>
          <TouchableOpacity
            style={[styles.chip, { minWidth: 44, alignItems: 'center' }]}
            onPress={() =>
              setRoomMetadata((prev) => ({
                ...prev,
                floor: Math.min(10, (prev.floor ?? -1) + 1),
              }))
            }
          >
            <Text style={styles.chipText}>+</Text>
          </TouchableOpacity>
        </View>
      </>
    )}

    <TouchableOpacity style={styles.saveFormButton} onPress={onSave}>
      <Icon name='check' size={18} color='#fff' />
      <Text style={styles.saveFormButtonText}>Save Property Info</Text>
    </TouchableOpacity>
  </View>
);
