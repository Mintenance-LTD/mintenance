import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { me } from '../../../design-system/mint-editorial';
import { fmt } from './constants';
import { styles } from './styles';

interface HeroSectionProps {
  totalSpent: number;
  thisMonth: number;
  inEscrow: number;
  insetsTop: number;
  onBack: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalSpent,
  thisMonth,
  inEscrow,
  insetsTop,
  onBack,
}) => {
  return (
    <LinearGradient
      colors={[me.brand2, me.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroDecorCircle} />
      <View style={styles.heroDecorSmall} />
      <View style={styles.heroDecorDiamond} />

      <View style={{ height: insetsTop + 12 }} />

      <View style={styles.heroNav}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={24} color={me.onBrand} />
        </TouchableOpacity>
        <Text style={styles.heroNavTitle}>My Finances</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.heroLabel}>Total Spent</Text>
      <Text style={styles.heroAmount}>{fmt(totalSpent)}</Text>

      <View style={styles.heroStatsRow}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{fmt(thisMonth)}</Text>
          <Text style={styles.heroStatLabel}>This Month</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{fmt(inEscrow)}</Text>
          <Text style={styles.heroStatLabel}>In Escrow</Text>
        </View>
      </View>
    </LinearGradient>
  );
};
