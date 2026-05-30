/**
 * DocIcon — 54×68 paper-shape tile used on every document card across
 * the homeowner /documents inbox and the contractor library. RN port of
 * apps/web/components/documents/DocIcon.tsx; matches the spec from
 * redesign-v2/documents-web.html:
 *   - Soft tinted background (type-coloured),
 *   - The type's icon centred,
 *   - A small white extension chip in the bottom-right corner
 *     ("PDF" / "JPG" / "BID" / "DOC").
 *
 * Pure presentational — colour pair + extension chip + centre icon all
 * come from the parent. Keeps the homeowner inbox and the contractor
 * library visually identical to the web spec.
 *
 * Note: the 30%-opacity type-colour border uses 8-digit hex (color + 33)
 * just like the web component does. The mobile pre-commit hex check
 * grandfathers `theme/` paths but not `components/documents/`, so this
 * file's hex literals are kept in tight ranges + token-derived where
 * possible.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

interface DocIconProps {
  /** Foreground colour (icon stroke + border tint + chip text). */
  color: string;
  /** Soft background tint. */
  bg: string;
  /** Top-right corner chip — "PDF", "JPG", "BID", "DOC", "PNG". */
  ext: string;
  /** Centre icon — pass <Ionicons name=… size=22 color={color} />. */
  children: React.ReactNode;
}

export function DocIcon({ color, bg, ext, children }: DocIconProps) {
  // 30%-opacity border on the type colour matches the web spec
  // (`border: "1px solid " + ts.color + "33"`). React Native doesn't
  // support `color-mix`, so we suffix the hex with the alpha channel.
  // Falls back to a token border when `color` isn't a hex string.
  const borderColor =
    color.startsWith('#') && (color.length === 7 || color.length === 4)
      ? `${color}33`
      : me.line;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: bg,
          borderColor,
        },
      ]}
      accessibilityRole='image'
    >
      {children}
      <View style={styles.chip}>
        <Text style={[styles.chipText, { color }]}>{ext}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 54,
    height: 68,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  chip: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: me.surface,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default DocIcon;
