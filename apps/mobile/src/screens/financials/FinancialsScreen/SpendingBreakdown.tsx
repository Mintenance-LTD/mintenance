import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_CONFIG, fmt } from './constants';
import { styles } from './styles';

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

interface SpendingBreakdownProps {
  totalSpent: number;
  categoryBreakdown: CategoryData[];
}

export const SpendingBreakdown: React.FC<SpendingBreakdownProps> = ({
  totalSpent,
  categoryBreakdown,
}) => {
  const donutSegments =
    categoryBreakdown.length > 0
      ? categoryBreakdown.slice(0, 5)
      : [{ category: 'general', amount: 0, percentage: 100 }];

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Spending Breakdown</Text>

      {categoryBreakdown.length > 0 && (
        <View style={styles.donutContainer}>
          <View style={styles.donutOuter}>
            <View style={styles.donutInner}>
              <Text style={styles.donutTotal}>{fmt(totalSpent)}</Text>
              <Text style={styles.donutLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.donutLegend}>
            {donutSegments.map((seg) => {
              const config = CATEGORY_CONFIG[seg.category] ??
                CATEGORY_CONFIG.general ?? {
                  icon: 'construct-outline' as const,
                  color: '#6B7280',
                  label: 'General',
                };
              return (
                <View key={seg.category} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: config.color },
                    ]}
                  />
                  <Text style={styles.legendLabel}>{config.label}</Text>
                  <Text style={styles.legendPercent}>{seg.percentage}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {categoryBreakdown.slice(0, 6).map((cat) => {
        const config = CATEGORY_CONFIG[cat.category] ??
          CATEGORY_CONFIG.general ?? {
            icon: 'construct-outline' as const,
            color: '#6B7280',
            label: 'General',
          };
        const barWidth = Math.max(cat.percentage, 4);
        return (
          <View key={cat.category} style={styles.categoryRow}>
            <View
              style={[
                styles.categoryIconWrap,
                { backgroundColor: `${config.color}18` },
              ]}
            >
              <Ionicons name={config.icon} size={16} color={config.color} />
            </View>
            <View style={styles.categoryInfo}>
              <View style={styles.categoryTopRow}>
                <Text style={styles.categoryName}>{config.label}</Text>
                <Text style={styles.categoryAmount}>{fmt(cat.amount)}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${barWidth}%`, backgroundColor: config.color },
                  ]}
                />
              </View>
            </View>
          </View>
        );
      })}

      {categoryBreakdown.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No spending data yet</Text>
        </View>
      )}
    </View>
  );
};
