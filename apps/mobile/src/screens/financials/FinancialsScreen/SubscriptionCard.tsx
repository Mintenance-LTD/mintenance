import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { styles } from './styles';

interface SubscriptionCardProps {
  planType: string;
  status: string;
  onPress: () => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ planType, status, onPress }) => {
  const isActive = status === 'active';
  return (
    <TouchableOpacity style={styles.subscriptionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.subscriptionLeft}>
        <View style={[styles.subscriptionIcon, { backgroundColor: isActive ? theme.colors.primaryLight : theme.colors.accentLight }]}>
          <Ionicons
            name={isActive ? 'shield-checkmark' : 'shield-outline'}
            size={20}
            color={isActive ? theme.colors.primary : theme.colors.accent}
          />
        </View>
        <View>
          <Text style={styles.subscriptionTitle}>{planType} Plan</Text>
          <Text style={styles.subscriptionStatus}>
            {isActive ? 'Active' : status}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
};
