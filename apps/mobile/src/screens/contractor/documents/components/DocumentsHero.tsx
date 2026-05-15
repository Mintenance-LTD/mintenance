import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { me } from '../../../../design-system/mint-editorial';
import { styles } from '../../DocumentsStyles';
import { formatFileSize } from '../types';
import { UPLOAD_ICON_ON_GREEN_GRADIENT } from '../theme/heroColors';

/**
 * Full-bleed gradient hero for the Documents screen — back button,
 * title + subtitle, optional upload icon, and three stat pills.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d).
 */
export function DocumentsHero({
  topInset,
  isContractor,
  count,
  categories,
  totalSize,
  onBack,
  onUpload,
}: {
  topInset: number;
  isContractor: boolean;
  count: number;
  categories: number;
  totalSize: number;
  onBack: () => void;
  onUpload: () => void;
}) {
  return (
    <LinearGradient
      colors={[me.brand2, me.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: topInset + 12 }]}
    >
      <View style={styles.decor1} />
      <View style={styles.decor2} />

      <View style={styles.heroNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={onBack}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={20} color={me.onBrand} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.heroTitle}>Documents</Text>
          <Text style={styles.heroSubtitle}>
            {count} {count === 1 ? 'file' : 'files'} uploaded
          </Text>
        </View>
        {isContractor && (
          <TouchableOpacity
            style={styles.uploadHeroBtn}
            onPress={onUpload}
            accessibilityRole='button'
            accessibilityLabel='Upload document'
          >
            <Ionicons
              name='cloud-upload-outline'
              size={18}
              color={UPLOAD_ICON_ON_GREEN_GRADIENT}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{count}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{categories}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>
            {totalSize > 0 ? formatFileSize(totalSize) : '—'}
          </Text>
          <Text style={styles.statLabel}>Total Size</Text>
        </View>
      </View>
    </LinearGradient>
  );
}
