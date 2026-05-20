import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Property } from './types';
import { me } from '../../../design-system/mint-editorial';

interface Props {
  properties: Property[] | undefined;
  selectedProperty: Property | null;
  onSelect: (property: Property) => void;
  onClose: () => void;
}

export const WherePanel: React.FC<Props> = ({
  properties,
  selectedProperty,
  onSelect,
  onClose,
}) => {
  const navigation = useNavigation();
  return (
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
            onPress={() => onSelect(property)}
          >
            <View style={styles.propertyIcon}>
              <Ionicons
                name='home'
                size={22}
                color={
                  selectedProperty?.id === property.id ? me.brand : me.ink2
                }
              />
            </View>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyName}>
                {property.property_name || 'Unnamed'}
              </Text>
              <Text style={styles.propertyAddress} numberOfLines={1}>
                {property.address || 'No address'}
              </Text>
              {property.property_type && (
                <Text style={styles.propertyType}>
                  {property.property_type}
                </Text>
              )}
            </View>
            {selectedProperty?.id === property.id && (
              <Ionicons name='checkmark-circle' size={22} color={me.brand} />
            )}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name='home-outline' size={36} color={me.brand} />
          <Text style={styles.emptyText}>No properties yet</Text>
          <Text style={styles.emptySubtext}>
            Add a property to start posting jobs
          </Text>
          <TouchableOpacity
            style={styles.addPropertyButton}
            onPress={() => {
              onClose();
              setTimeout(() => {
                (navigation as any).navigate('ProfileTab', {
                  screen: 'AddProperty',
                });
              }, 300);
            }}
            accessibilityRole='button'
            accessibilityLabel='Add a property'
          >
            <Ionicons name='add-circle-outline' size={18} color={me.brand} />
            <Text style={styles.addPropertyText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { paddingTop: 20 },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 16,
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: me.surface,
    marginBottom: 10,
    gap: 12,
  },
  propertyCardActive: { backgroundColor: me.bg2 },
  propertyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 15, fontWeight: '600', color: me.ink },
  propertyAddress: { fontSize: 13, color: me.ink2, marginTop: 1 },
  propertyType: {
    fontSize: 11,
    color: me.ink3,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: me.ink2 },
  emptySubtext: { fontSize: 13, color: me.ink3, marginTop: 4 },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 28,
    backgroundColor: me.bg2,
  },
  addPropertyText: { fontSize: 14, fontWeight: '600', color: me.brand },
});
