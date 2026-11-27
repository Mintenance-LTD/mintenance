import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { me } from '../../../design-system/mint-editorial';

export const inboxStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: me.bg },
  header: { paddingHorizontal: 16, borderBottomWidth: 1, borderColor: me.line },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  keyboard: { flex: 1 },
  panel: {
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: me.radius.card,
    backgroundColor: me.surface,
  },
  title: { fontSize: 27, fontFamily: me.font.display, color: me.ink },
  heading: { fontSize: 17, fontFamily: me.font.display, color: me.ink },
  text: {
    fontSize: 15,
    fontFamily: me.font.body,
    color: me.ink,
    lineHeight: 22,
  },
  muted: {
    fontSize: 14,
    fontFamily: me.font.body,
    color: me.ink2,
    lineHeight: 20,
  },
  eyebrow: { fontSize: 12, fontFamily: me.font.bodyBold, color: me.brand2 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: me.radius.btn,
    backgroundColor: me.bg2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: { backgroundColor: me.brand2 },
  buttonSelected: {
    backgroundColor: me.brandSoft,
    borderWidth: 1,
    borderColor: me.brand2,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { fontFamily: me.font.bodySemiBold, fontSize: 14, color: me.ink },
  buttonTextPrimary: { color: me.onBrand },
  back: { alignSelf: 'flex-start', marginVertical: 4 },
  input: {
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: me.radius.input,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: me.ink,
    fontFamily: me.font.body,
    fontSize: 16,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  item: {
    paddingVertical: 12,
    gap: 4,
    borderTopWidth: 1,
    borderColor: me.line2,
  },
  itemText: { flex: 1, flexShrink: 1 },
  error: {
    color: me.errFg,
    backgroundColor: me.errBg,
    borderRadius: me.radius.input,
    padding: 10,
    fontSize: 14,
    lineHeight: 20,
  },
});

export function InboxButton({
  label,
  onPress,
  primary,
  selected,
  disabled,
  back,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  selected?: boolean;
  disabled?: boolean;
  back?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        inboxStyles.button,
        primary && inboxStyles.buttonPrimary,
        selected && inboxStyles.buttonSelected,
        (disabled || pressed) && inboxStyles.buttonDisabled,
        back && inboxStyles.back,
      ]}
    >
      <Text
        style={[
          inboxStyles.buttonText,
          primary && inboxStyles.buttonTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function InboxField({
  label,
  value,
  onChange,
  maxLength,
  multiline,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      <Text style={inboxStyles.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[inboxStyles.input, multiline && inboxStyles.multiline]}
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        multiline={multiline}
        editable={!disabled}
      />
    </>
  );
}

export function InboxError({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <View style={inboxStyles.panel}>
      <Text accessibilityRole='alert' style={inboxStyles.error}>
        {message}
      </Text>
      {retry && <InboxButton label='Try again' onPress={retry} />}
    </View>
  );
}

export function InboxLoading({ message }: { message: string }) {
  return (
    <View style={inboxStyles.panel}>
      <ActivityIndicator color={me.brand2} accessibilityLabel={message} />
      <Text accessibilityLiveRegion='polite' style={inboxStyles.muted}>
        {message}
      </Text>
    </View>
  );
}
