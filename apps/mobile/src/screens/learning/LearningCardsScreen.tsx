/**
 * LearningCardsScreen — mobile 60-second how-to catalogue.
 * R3 #20 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Uses the same card metadata as the web /learn page. Cards without
 * videoUrl show a "Coming soon" badge.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface LearningCard {
  id: string;
  audience: 'contractor' | 'homeowner' | 'all';
  title: string;
  description: string;
  durationSeconds: number;
  videoUrl: string | null;
}

const CARDS: LearningCard[] = [
  {
    id: 'contractor-before-photo',
    audience: 'contractor',
    title: 'How to take a before-photo',
    description:
      'Composition, lighting, and the 100m GPS check — under a minute.',
    durationSeconds: 60,
    videoUrl: null,
  },
  {
    id: 'contractor-stripe-connect',
    audience: 'contractor',
    title: 'What Stripe Connect asks for',
    description:
      'Exactly which documents Stripe needs before your first payout.',
    durationSeconds: 60,
    videoUrl: null,
  },
];

export const LearningCardsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
    >
      <View style={styles.header}>
        <Text style={styles.h1}>60-second how-tos</Text>
        <Text style={styles.subtitle}>
          Quick, practical videos. Keep your phone in one hand.
        </Text>
      </View>

      <View style={styles.grid}>
        {CARDS.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            disabled={!c.videoUrl}
            onPress={() => {
              // TODO(R3-polish): open an in-app video player when videoUrl
              // lands. For now the card is a visual placeholder.
            }}
          >
            <View style={styles.thumb}>
              <Ionicons
                name='play-circle-outline'
                size={56}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.body}>
              <Text style={styles.meta}>
                {c.durationSeconds}s ·{' '}
                {c.audience === 'all' ? 'everyone' : c.audience + 's'}
              </Text>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardDesc}>{c.description}</Text>
              {!c.videoUrl && (
                <Text style={styles.comingSoon}>Coming soon</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  thumb: {
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 14,
  },
  meta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  comingSoon: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.colors.accent,
    textTransform: 'uppercase',
  },
});

export default LearningCardsScreen;
