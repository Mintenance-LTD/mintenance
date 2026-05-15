import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../jobDetailsStyles';

interface Props {
  budget: number;
  onEscrowInfo: () => void;
}

export const JobPricingCard: React.FC<Props> = ({ budget, onEscrowInfo }) => (
  <>
    <View style={styles.divider} />
    <View style={styles.sectionPadded}>
      <Text style={styles.sectionLabel}>Budget</Text>
      <View style={styles.pricingCard}>
        <View style={styles.pricingMain}>
          <Text style={styles.pricingAmount}>
            {'\u00A3'}
            {budget.toLocaleString()}
          </Text>
          <Text style={styles.pricingLabelText}>Estimated cost</Text>
        </View>
        <View style={styles.escrowBadge}>
          <Ionicons name='shield-checkmark' size={16} color={me.ink2} />
          <Text style={styles.escrowText}>Escrow protected</Text>
          <TouchableOpacity
            onPress={onEscrowInfo}
            accessibilityRole='button'
            accessibilityLabel='Learn how escrow protection works'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name='information-circle-outline'
              size={18}
              color={me.ink2}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </>
);
