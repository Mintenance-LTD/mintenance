import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Banner } from '../../../components/ui/Banner';
import { theme } from '../../../theme';

interface MessageComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  isSending: boolean;
  error: string | null;
  bottomInset: number;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  value,
  onChangeText,
  onSend,
  onAttach,
  isSending,
  error,
  bottomInset,
}) => {
  const isDisabled = !value.trim() || isSending;

  return (
    <View
      style={[
        styles.inputContainer,
        { paddingBottom: Math.max(bottomInset, theme.spacing[3]) },
      ]}
    >
      {error ? (
        <Banner
          message={error}
          variant='error'
          testID='messaging-composer-error'
        />
      ) : null}
      <View style={styles.inputWrapper}>
        {onAttach && (
          <TouchableOpacity
            style={styles.attachButton}
            onPress={onAttach}
            disabled={isSending}
            accessibilityLabel="Attach image"
          >
            <Ionicons name="image-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder='Type a message...'
          placeholderTextColor={theme.colors.placeholder}
          multiline
          maxLength={500}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, isDisabled && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={isDisabled}
        >
          {isSending ? (
            <ActivityIndicator size='small' color={theme.colors.surface} />
          ) : (
            <Ionicons name='send' size={20} color={theme.colors.surface} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing[2],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    maxHeight: 100,
    textAlignVertical: 'center',
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceTertiary,
  },
  attachButton: {
    padding: 6,
    marginRight: 4,
  },
});
