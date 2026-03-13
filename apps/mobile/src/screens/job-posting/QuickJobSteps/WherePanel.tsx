import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Property } from './types';

interface Props {
  properties: Property[] | undefined;
  selectedProperty: Property | null;
  onSelect: (property: Property) => void;
  onClose: () => void;
}

export const WherePanel: React.FC<Props> = ({ properties, selectedProperty, onSelect, onClose }) => {
  const navigation = useNavigation();
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Select your property</Text>
      {properties && properties.length > 0 ? (
        properties.map((property) => (
          <TouchableOpacity key={property.id} style={[styles.propertyCard, selectedProperty?.id === property.id && styles.propertyCardActive]} onPress={() => onSelect(property)}>
            <View style={styles.propertyIcon}>
              <Ionicons name='home' size={22} color={selectedProperty?.id === property.id ? '#10B981' : '#717171'} />
            </View>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyName}>{property.property_name || 'Unnamed'}</Text>
              <Text style={styles.propertyAddress} numberOfLines={1}>{property.address || 'No address'}</Text>
              {property.property_type && (
                <Text style={styles.propertyType}>{property.property_type}</Text>
              )}
            </View>
            {selectedProperty?.id === property.id && (
              <Ionicons name='checkmark-circle' size={22} color='#10B981' />
            )}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name='home-outline' size={36} color='#10B981' />
          <Text style={styles.emptyText}>No properties yet</Text>
          <Text style={styles.emptySubtext}>Add a property to start posting jobs</Text>
          <TouchableOpacity style={styles.addPropertyButton} onPress={() => { onClose(); setTimeout(() => { (navigation as any).navigate('ProfileTab', { screen: 'AddProperty' }); }, 300); }} accessibilityRole='button' accessibilityLabel='Add a property'>
            <Ionicons name='add-circle-outline' size={18} color='#10B981' />
            <Text style={styles.addPropertyText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { paddingTop: 20 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#222222', marginBottom: 16 },
  propertyCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: 10, gap: 12 },
  propertyCardActive: { backgroundColor: '#F7F7F7' },
  propertyIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 15, fontWeight: '600', color: '#222222' },
  propertyAddress: { fontSize: 13, color: '#717171', marginTop: 1 },
  propertyType: { fontSize: 11, color: '#B0B0B0', marginTop: 2, textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#717171' },
  emptySubtext: { fontSize: 13, color: '#B0B0B0', marginTop: 4 },
  addPropertyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 28, backgroundColor: '#F7F7F7' },
  addPropertyText: { fontSize: 14, fontWeight: '600', color: '#10B981' },
});
