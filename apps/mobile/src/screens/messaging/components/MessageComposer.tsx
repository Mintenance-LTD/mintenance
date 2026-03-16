/**
 * MessageComposer — Modern input bar with green send button
 *
 * Pill-shaped input, camera + gallery attach icons,
 * green send button that activates when text is present.
 */

import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Banner } from '../../../components/ui/Banner';
import { theme } from '../../../theme';

interface MessageComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onCamera?: () => void;
  isSending: boolean;
  error: string | null;
  bottomInset: number;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  value,
  onChangeText,
  onSend,
  onAttach,
  onCamera,
  isSending,
  error,
  bottomInset,
}) => {
  const hasText = value.trim().length > 0;
  const isDisabled = !hasText || isSending;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(bottomInset, 8) },
      ]}
    >
      {error ? (
        <Banner
          message={error}
          variant="error"
          testID="messaging-composer-error"
        />
      ) : null}
      <View style={styles.inputRow}>
        {/* Attachment actions */}
        <View style={styles.attachActions}>
          {onAttach && (
            <TouchableOpacity
              style={styles.attachButton}
              onPress={onAttach}
              disabled={isSending}
              accessibilityLabel="Attach image from gallery"
            >
              <Ionicons name="image-outline" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onCamera && (
            <TouchableOpacity
              style={styles.attachButton}
              onPress={onCamera}
              disabled={isSending}
              accessibilityLabel="Take a photo"
            >
              <Ionicons name="camera-outline" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Text input */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={500}
            editable={!isSending}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            hasText && !isSending ? styles.sendButtonActive : styles.sendButtonInactive,
          ]}
          onPress={onSend}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          {isSending ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={theme.colors.textInverse}
              style={{ marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    gap: 2,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    maxHeight: 100,
    lineHeight: 22,
    paddingVertical: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonActive: {
    backgroundColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  sendButtonInactive: {
    backgroundColor: '#E0E0E0',
  },
});
