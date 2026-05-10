import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SearchResult } from '../../../services/AISearchService';
import { theme } from '../../../theme';
import { formatCurrency } from '../../../utils/formatCurrency';
import { styles } from '../theme/styles';
import { getTypeConfig } from '../theme/typeConfig';

/**
 * One search result row — icon, title/description, location/price/rating
 * metadata, and a relevance-score badge.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44e).
 */
export function SearchResultItem({ result }: { result: SearchResult }) {
  const config = getTypeConfig(result.type);
  return (
    <TouchableOpacity
      style={styles.resultItem}
      accessibilityRole='button'
      accessibilityLabel={`${result.type}: ${result.title}. ${result.description}. ${Math.round(result.relevanceScore * 100)}% match`}
    >
      <View style={[styles.resultIconWrap, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>
      <View style={styles.resultDetails}>
        <Text style={styles.resultTitle}>{result.title}</Text>
        <Text style={styles.resultDescription} numberOfLines={2}>
          {result.description}
        </Text>
        <View style={styles.resultMetadata}>
          {result.metadata.location && (
            <View style={styles.metadataItem}>
              <Ionicons
                name='location-outline'
                size={13}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.metadataText}>
                {result.metadata.location}
              </Text>
            </View>
          )}
          {result.metadata.price && (
            <View style={styles.metadataItem}>
              <Ionicons
                name='cash-outline'
                size={13}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.metadataText}>
                {formatCurrency(Number(result.metadata.price))}
              </Text>
            </View>
          )}
          {result.metadata.rating && (
            <View style={styles.metadataItem}>
              <Ionicons name='star' size={13} color={theme.colors.accent} />
              <Text style={styles.metadataText}>
                {result.metadata.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.relevanceScore}>
        <Text style={styles.scoreText}>
          {Math.round(result.relevanceScore * 100)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}
