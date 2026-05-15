/**
 * AccessibilitySettingsScreen — mobile Silver-mode toggle.
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md.
 *
 * Mirrors /settings/accessibility on web. Keeps the screen minimal;
 * future accessibility toggles layer in here.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSilverMode } from '../../hooks/useSilverMode';
import { me } from '../../design-system/mint-editorial';

export const AccessibilitySettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { silverMode, toggle, loading } = useSilverMode();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={me.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
    >
      <View style={styles.section}>
        <View style={styles.rowTop}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowTitle}>Silver mode</Text>
            <Text style={styles.rowDesc}>
              Larger fonts and bigger taps across key flows. Best if you find
              the standard layout hard to read or hit.
            </Text>
          </View>
          <Switch
            value={silverMode}
            onValueChange={() => {
              void toggle();
            }}
            trackColor={{
              false: me.line,
              true: me.brand,
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    ...me.shadow.card,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabelGroup: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  rowDesc: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
});

export default AccessibilitySettingsScreen;
