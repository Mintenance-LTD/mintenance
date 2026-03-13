/**
 * QuickActionsHomeowner Component
 *
 * Airbnb category-bar-style horizontal icon circles.
 * Each action is a circle icon with label below, scrollable row.
 * Clean, minimal, easy to scan at a glance.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickActionsHomeownerProps {
  onPostJobPress: () => void;
  onPropertiesPress: () => void;
  onFindContractorsPress: () => void;
  onMessagesPress: () => void;
}

interface ActionItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  onPress: () => void;
}

export const QuickActionsHomeowner: React.FC<QuickActionsHomeownerProps> = ({
  onPostJobPress,
  onPropertiesPress,
  onFindContractorsPress,
  onMessagesPress,
}) => {
  const actions: ActionItem[] = [
    {
      label: 'Post Job',
      icon: 'add-circle',
      iconColor: '#10B981',
      bgColor: '#D1FAE5',
      onPress: onPostJobPress,
    },
    {
      label: 'Find Pros',
      icon: 'search',
      iconColor: '#3B82F6',
      bgColor: '#DBEAFE',
      onPress: onFindContractorsPress,
    },
    {
      label: 'Properties',
      icon: 'home',
      iconColor: '#8B5CF6',
      bgColor: '#EDE9FE',
      onPress: onPropertiesPress,
    },
    {
      label: 'Messages',
      icon: 'chatbubble',
      iconColor: '#F59E0B',
      bgColor: '#FEF3C7',
      onPress: onMessagesPress,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionItem}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.bgColor }]}>
              <Ionicons name={action.icon} size={24} color={action.iconColor} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  scrollContent: {
    gap: 20,
    paddingRight: 8,
  },
  actionItem: {
    alignItems: 'center',
    width: 72,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#222222',
    textAlign: 'center',
  },
});
