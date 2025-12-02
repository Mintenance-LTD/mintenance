/**
 * ProfileCompletionCard Component (React Native)
 * Mobile version of profile completion widget
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProfileCompletionItem {
  id: string;
  label: string;
  weight: number;
  completed: boolean;
  action: string;
}

interface ProfileCompletionCardProps {
  items: ProfileCompletionItem[];
  completion: number;
  onItemClick?: (item: ProfileCompletionItem) => void;
  compact?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProfileCompletionCard({
  items,
  completion,
  onItemClick,
  compact = false,
}: ProfileCompletionCardProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completion,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [completion]);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  // Calculate stroke dash offset for circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  if (completion === 100 && compact) {
    return (
      <View style={styles.completeBadge}>
        <Text style={styles.completeBadgeText}>🏆 Profile Complete!</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header with circular progress */}
      <View style={styles.header}>
        {/* Circular progress */}
        <View style={styles.circularProgress}>
          <Svg width={100} height={100}>
            {/* Background circle */}
            <Circle
              cx={50}
              cy={50}
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={8}
              fill="none"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={50}
              cy={50}
              r={radius}
              stroke={
                completion === 100
                  ? '#10B981'
                  : completion >= 75
                  ? '#0066CC'
                  : completion >= 50
                  ? '#F59E0B'
                  : '#F97316'
              }
              strokeWidth={8}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 50 50)`}
            />
          </Svg>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>{completion}%</Text>
          </View>
        </View>

        {/* Title and description */}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {completion === 100 ? 'Profile Complete!' : 'Complete Your Profile'}
          </Text>
          <Text style={styles.headerDescription}>
            {completion === 100
              ? 'Great job! Your profile is fully optimized.'
              : `${completedCount} of ${totalCount} completed`}
          </Text>
        </View>
      </View>

      {/* Completion items */}
      {!compact && (
        <View style={styles.itemsContainer}>
          {items.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => !item.completed && onItemClick?.(item)}
              disabled={item.completed}
              style={[
                styles.item,
                item.completed && styles.itemCompleted,
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  item.completed && styles.checkboxCompleted,
                ]}
              >
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.itemLabel,
                  item.completed && styles.itemLabelCompleted,
                ]}
              >
                {item.label}
              </Text>
              {!item.completed && <Text style={styles.arrow}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Celebration for 100% */}
      {completion === 100 && !compact && (
        <View style={styles.celebration}>
          <Text style={styles.celebrationIcon}>🏆</Text>
          <View style={styles.celebrationContent}>
            <Text style={styles.celebrationTitle}>Awesome!</Text>
            <Text style={styles.celebrationText}>
              Your profile is complete. Start exploring!
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  circularProgress: {
    position: 'relative',
    marginRight: 16,
  },
  percentageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemsContainer: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  itemCompleted: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  itemLabelCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  arrow: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  celebration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  celebrationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  celebrationContent: {
    flex: 1,
  },
  celebrationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 4,
  },
  celebrationText: {
    fontSize: 14,
    color: '#047857',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  completeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
  },
});

export default ProfileCompletionCard;
