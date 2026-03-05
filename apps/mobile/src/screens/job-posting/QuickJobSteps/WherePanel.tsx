import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../../theme';
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
              <Ionicons name='home' size={22} color={selectedProperty?.id === property.id ? '#222222' : theme.colors.textSecondary} />
            </View>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyName}>{property.property_name || 'Unnamed'}</Text>
              <Text style={styles.propertyAddress} numberOfLines={1}>{property.address || 'No address'}</Text>
              {property.property_type && (
                <Text style={styles.propertyType}>{property.property_type}</Text>
              )}
            </View>
            {selectedProperty?.id === property.id && (
              <Ionicons name='checkmark-circle' size={22} color='#222222' />
            )}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name='home-outline' size={36} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>No properties yet</Text>
          <Text style={styles.emptySubtext}>Add a property to start posting jobs</Text>
          <TouchableOpacity style={styles.addPropertyButton} onPress={() => { onClose(); setTimeout(() => { (navigation as any).navigate('ProfileTab', { screen: 'AddProperty' }); }, 300); }} accessibilityRole='button' accessibilityLabel='Add a property'>
            <Ionicons name='add-circle-outline' size={18} color={theme.colors.primary} />
            <Text style={styles.addPropertyText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { paddingTop: 20 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16 },
  propertyCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: 10, gap: 12 },
  propertyCardActive: { borderColor: '#222222', backgroundColor: '#F7F7F7' },
  propertyIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  propertyAddress: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1 },
  propertyType: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2, textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  emptySubtext: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 4 },
  addPropertyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.backgroundSecondary },
  addPropertyText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
});