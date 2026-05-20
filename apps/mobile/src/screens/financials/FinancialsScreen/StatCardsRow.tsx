import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { fmt } from './constants';
import { styles } from './styles';

interface StatCardsRowProps {
  totalSpent: number;
  inEscrow: number;
  refunded: number;
}

export const StatCardsRow: React.FC<StatCardsRowProps> = ({
  totalSpent,
  inEscrow,
  refunded,
}) => {
  return (
    <View style={styles.statCardsRow}>
      <View style={styles.statCard}>
        <Ionicons name='card-outline' size={16} color={me.brand} />
        <Text style={styles.statCardValue}>{fmt(totalSpent)}</Text>
        <Text style={styles.statCardLabel}>Spent</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name='lock-closed-outline' size={16} color='#3B82F6' />
        <Text style={styles.statCardValue}>{fmt(inEscrow)}</Text>
        <Text style={styles.statCardLabel}>Escrow</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name='arrow-undo-outline' size={16} color={me.accent} />
        <Text style={styles.statCardValue}>{fmt(refunded)}</Text>
        <Text style={styles.statCardLabel}>Refunded</Text>
      </View>
    </View>
  );
};
