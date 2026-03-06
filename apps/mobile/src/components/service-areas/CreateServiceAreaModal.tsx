import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface CreateServiceAreaModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  onCreate: (data: {
    area_name: string;
    center_latitude: number;
    center_longitude: number;
    radius_km: number;
    is_primary_area: boolean;
  }) => Promise<void>;
}

const RADIUS_OPTIONS = [5, 10, 15, 20, 30, 50];

export const CreateServiceAreaModal: React.FC<CreateServiceAreaModalProps> = ({
  visible,
  onClose,
  onCreated,
  onCreate,
}) => {
  const [areaName, setAreaName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [isPrimary, setIsPrimary] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAreaName('');
    setPostcode('');
    setRadiusKm(10);
    setIsPrimary(false);
    setGeocoding(false);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const geocodePostcode = async (
    query: string
  ): Promise<{ lat: number; lon: number } | null> => {
    try {
      const encoded = encodeURIComponent(query + ', UK');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      if (results && results.length > 0) {
        return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    const nameTrimmed = areaName.trim();
    const postcodeTrimmed = postcode.trim();

    if (!nameTrimmed) {
      Alert.alert('Validation', 'Please enter an area name.');
      return;
    }
    if (!postcodeTrimmed) {
      Alert.alert('Validation', 'Please enter a postcode or town name.');
      return;
    }

    setGeocoding(true);
    const coords = await geocodePostcode(postcodeTrimmed);
    setGeocoding(false);

    if (!coords) {
      Alert.alert(
        'Location not found',
        `Could not find coordinates for "${postcodeTrimmed}". Please check and try again.`
      );
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        area_name: nameTrimmed,
        center_latitude: coords.lat,
        center_longitude: coords.lon,
        radius_km: radiusKm,
        is_primary_area: isPrimary,
      });
      reset();
      onCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create service area';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const isLoading = geocoding || saving;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Service Area</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} disabled={isLoading}>
              <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Area name */}
            <Text style={styles.label}>Area Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cheltenham Central"
              placeholderTextColor={theme.colors.textTertiary}
              value={areaName}
              onChangeText={setAreaName}
              editable={!isLoading}
            />

            {/* Postcode / town */}
            <Text style={styles.label}>Postcode or Town *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. GL50 1QN or Cheltenham"
              placeholderTextColor={theme.colors.textTertiary}
              value={postcode}
              onChangeText={setPostcode}
              autoCapitalize="characters"
              editable={!isLoading}
            />
            <Text style={styles.hint}>
              We'll pin the centre of your service area here.
            </Text>

            {/* Radius */}
            <Text style={styles.label}>Coverage Radius</Text>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
                  onPress={() => setRadiusKm(r)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      radiusKm === r && styles.radiusChipTextActive,
                    ]}
                  >
                    {r} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Primary toggle */}
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setIsPrimary((v) => !v)}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, isPrimary && styles.checkboxChecked]}>
                {isPrimary && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <View style={styles.checkLabel}>
                <Text style={styles.checkTitle}>Set as primary area</Text>
                <Text style={styles.checkSub}>
                  Your primary area is shown first to homeowners.
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Save Service Area</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  radiusChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  radiusChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  radiusChipTextActive: {
    color: '#fff',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkLabel: {
    flex: 1,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  checkSub: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  submitBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.base,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
