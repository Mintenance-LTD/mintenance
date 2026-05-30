/**
 * DocumentsHero — Mint Editorial v2 (2026-05-23 redesign).
 *
 * Replaces the prior full-bleed mint-gradient hero (2 decorative
 * circles + 3-up stat pills "Documents / Categories / Total Size")
 * with the calm editorial pattern: paper bg, mint eyebrow, serif
 * "Documents" title, single muted subtitle counting files, and a
 * mint-soft upload pill in the top-right for contractors.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';
import { formatFileSize } from '../types';

interface Props {
  topInset: number;
  isContractor: boolean;
  count: number;
  categories: number;
  totalSize: number;
  onBack: () => void;
  onUpload: () => void;
}

export function DocumentsHero({
  topInset,
  isContractor,
  count,
  categories,
  totalSize,
  onBack,
  onUpload,
}: Props) {
  const subtitleParts: string[] = [
    `${count} ${count === 1 ? 'file' : 'files'}`,
  ];
  if (categories > 0) {
    subtitleParts.push(
      `${categories} ${categories === 1 ? 'category' : 'categories'}`
    );
  }
  if (totalSize > 0) {
    subtitleParts.push(formatFileSize(totalSize));
  }
  const subtitle = subtitleParts.join(' · ');

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 12 }]}>
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.iconBtn}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
        {isContractor ? (
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={onUpload}
            accessibilityRole='button'
            accessibilityLabel='Upload document'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='cloud-upload-outline' size={16} color={me.brand} />
            <Text style={styles.uploadText}>Upload</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.eyebrow}>Library</Text>
      <Text style={styles.title}>Documents</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: me.bg,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: me.brandSoft,
    borderWidth: 1,
    borderColor: me.brandSoft,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.brand,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: me.ink3,
  },
});
