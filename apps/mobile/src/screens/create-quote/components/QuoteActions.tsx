/**
 * QuoteActions — Save Draft + Send Quote buttons
 *
 * Two clear actions: outline Save Draft, green Send Quote.
 * No Cancel button (back nav handles it).
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface QuoteActionsProps {
  loading: boolean;
  onSave: () => void;
  onSend: () => void;
  onBack: () => void;
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  loading,
  onSave,
  onSend,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.draftButton}
        onPress={onSave}
        disabled={loading}
        accessibilityRole='button'
        accessibilityLabel={loading ? 'Saving quote' : 'Save as draft'}
      >
        {loading ? (
          <ActivityIndicator size='small' color={me.ink} />
        ) : (
          <>
            <Ionicons name='bookmark-outline' size={18} color={me.ink} />
            <Text style={styles.draftButtonText}>Save Draft</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sendButton}
        onPress={onSend}
        disabled={loading}
        accessibilityRole='button'
        accessibilityLabel={loading ? 'Sending quote' : 'Send quote to client'}
      >
        {loading ? (
          <ActivityIndicator size='small' color={me.onBrand} />
        ) : (
          <>
            <Ionicons name='send' size={16} color={me.onBrand} />
            <Text style={styles.sendButtonText}>Send Quote</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: me.surface,
    borderWidth: 1.5,
    borderColor: me.ink,
  },
  draftButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  sendButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: me.ink,
    ...me.shadow.pop,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: me.onBrand,
  },
});
