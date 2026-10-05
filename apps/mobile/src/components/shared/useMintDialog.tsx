import React, { useCallback, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { AlertButton } from 'react-native';
import { me } from '../../design-system/mint-editorial';

/** Branded in-app notices; native permission prompts remain system-owned. */
export function useMintDialog() {
  const [notice, setNotice] = useState<{
    title: string;
    message?: string;
    buttons: AlertButton[];
  } | null>(null);
  const alert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setNotice({
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      });
    },
    []
  );
  const dismiss = () => {
    const cancel = notice?.buttons.find((button) => button.style === 'cancel');
    setNotice(null);
    cancel?.onPress?.();
  };
  const dialog = notice ? (
    <Modal transparent animationType='fade' visible onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title} accessibilityRole='header'>
              {notice.title}
            </Text>
            {notice.message ? (
              <Text style={styles.message}>{notice.message}</Text>
            ) : null}
            <View style={styles.actions}>
              {notice.buttons.map((button, index) => (
                <Pressable
                  key={index}
                  accessibilityRole='button'
                  onPress={() => {
                    setNotice(null);
                    button.onPress?.();
                  }}
                  style={[
                    styles.button,
                    button.style === 'cancel' && styles.cancel,
                    button.style === 'destructive' && styles.destructive,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'cancel' && styles.cancelText,
                    ]}
                  >
                    {button.text ?? 'OK'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  ) : null;
  return { alert, dialog };
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,37,32,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: me.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: me.line,
  },
  content: { padding: 24 },
  title: { fontSize: 23, fontWeight: '600', color: me.ink, marginBottom: 12 },
  message: { fontSize: 16, lineHeight: 24, color: me.ink2 },
  actions: { marginTop: 24, gap: 10 },
  button: {
    minHeight: 48,
    borderRadius: 14,
    padding: 14,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { backgroundColor: me.bg2 },
  destructive: { backgroundColor: me.errFg },
  buttonText: { color: me.onBrand, fontSize: 16, fontWeight: '600' },
  cancelText: { color: me.ink },
});
