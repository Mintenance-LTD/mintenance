/**
 * MintScreenBackBar — safe-area-padded back affordance for Mint
 * Editorial screens that render no header of their own.
 *
 * Every navigator sets headerShown:false, so a screen without its own
 * back control is gesture/hardware-back only — iOS users must know to
 * swipe (2026-07-31 back-button audit P2). Mount this at the top of
 * such screens, OUTSIDE any ScrollView so it stays fixed.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import { goBackSafe } from '../../navigation/hooks';

interface MintScreenBackBarProps {
  /** Optional small title rendered next to the arrow. */
  title?: string;
  /** Screen to navigate to when there is no history (deep-link entry). */
  fallbackScreen?: string;
  /** Pass false when the parent is already a SafeAreaView. */
  withTopInset?: boolean;
}

export const MintScreenBackBar: React.FC<MintScreenBackBarProps> = ({
  title,
  fallbackScreen,
  withTopInset = true,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.bar, { paddingTop: (withTopInset ? insets.top : 0) + 8 }]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => goBackSafe(navigation, fallbackScreen)}
        accessibilityRole='button'
        accessibilityLabel='Go back'
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name='arrow-back' size={20} color={me.ink} />
      </TouchableOpacity>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: me.bg2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...me.shadow.card,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
});

export default MintScreenBackBar;
