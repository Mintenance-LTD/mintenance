/**
 * MessageComposer — Modern input bar with brand send button.
 * Direction A · Mint Editorial — token-styled.
 *
 * Pill-shaped input, camera + gallery attach icons, brand send
 * button that activates when text is present.
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
import { me } from '../../../design-system/mint-editorial';

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
      style={[styles.container, { paddingBottom: Math.max(bottomInset, 8) }]}
    >
      {error ? (
        <Banner
          mint
          message={error}
          variant='error'
          testID='messaging-composer-error'
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
              accessibilityLabel='Attach image from gallery'
            >
              <Ionicons name='image-outline' size={22} color={me.ink2} />
            </TouchableOpacity>
          )}
          {onCamera && (
            <TouchableOpacity
              style={styles.attachButton}
              onPress={onCamera}
              disabled={isSending}
              accessibilityLabel='Take a photo'
            >
              <Ionicons name='camera-outline' size={22} color={me.ink2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Text input */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder='Type a message...'
            placeholderTextColor={me.ink4}
            multiline
            maxLength={500}
            editable={!isSending}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            hasText && !isSending
              ? styles.sendButtonActive
              : styles.sendButtonInactive,
            { opacity: isDisabled ? 0.4 : 1 },
          ]}
          onPress={onSend}
          disabled={isDisabled}
          accessibilityRole='button'
          accessibilityLabel='Send message'
        >
          {isSending ? (
            <ActivityIndicator size='small' color={me.onBrand} />
          ) : (
            <Ionicons
              name='send'
              size={18}
              color={me.onBrand}
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
    backgroundColor: me.surface,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
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
    backgroundColor: me.bg2,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: me.ink,
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
    backgroundColor: me.brand,
    ...me.shadow.btn,
  },
  sendButtonInactive: {
    backgroundColor: me.line,
  },
});
