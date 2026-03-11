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
import { theme } from '../../theme';

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
              stroke={theme.colors.border}
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
                  ? theme.colors.primary
                  : completion >= 75
                  ? theme.colors.primary
                  : completion >= 50
                  ? theme.colors.accent
                  : theme.colors.warning
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[5],
    ...theme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[5],
  },
  circularProgress: {
    position: 'relative',
    marginRight: theme.spacing.md,
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
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  headerDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  itemsContainer: {
    gap: theme.spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
  },
  itemCompleted: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.border,
  },
  checkbox: {
    width: theme.spacing[5],
    height: theme.spacing[5],
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  itemLabel: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  itemLabelCompleted: {
    color: theme.colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  arrow: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textTertiary,
  },
  celebration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[5],
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  celebrationIcon: {
    fontSize: theme.typography.fontSize['4xl'],
    marginRight: theme.spacing[3],
  },
  celebrationContent: {
    flex: 1,
  },
  celebrationTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.xs,
  },
  celebrationText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primaryDark,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  completeBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryDark,
  },
});

export default ProfileCompletionCard;
