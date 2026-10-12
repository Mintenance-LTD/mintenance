import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertButton,
  AlertOptions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

type Notice = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
};

/** App-wide adapter preserves existing Alert callbacks while replacing OS chrome.
 * Native permission prompts and Alert.prompt remain owned by the OS.
 */
export function ThemedAlertHost() {
  const [queue, setQueue] = useState<Notice[]>([]);
  const settling = useRef(false);
  const notice = queue[0];
  useEffect(() => {
    const original = Alert.alert;
    const show: typeof Alert.alert = (title, message, buttons, options) => {
      setQueue((current) => [...current, { title, message, buttons, options }]);
    };
    Alert.alert = show;
    return () => {
      if (Alert.alert === show) Alert.alert = original;
    };
  }, []);
  useEffect(() => {
    settling.current = false;
  }, [notice]);
  const finish = (button?: AlertButton) => {
    if (!notice || settling.current) return;
    settling.current = true;
    setQueue((current) => current.slice(1));
    if (button) button.onPress?.();
    else notice.options?.onDismiss?.();
  };
  const dismiss = () => {
    if (notice?.options?.cancelable) finish();
  };
  const error = /error|failed|unable/i.test(notice?.title ?? '');
  const warning = /required|invalid|missing|warning/i.test(notice?.title ?? '');
  const tone = error ? me.errFg : warning ? me.warnFg : me.brand2;
  const buttons = notice?.buttons?.length ? notice.buttons : [{ text: 'OK' }];
  return (
    <Modal
      visible={!!notice}
      transparent
      animationType='fade'
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityElementsHidden
          importantForAccessibility='no-hide-descendants'
        />
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            <Ionicons
              name={
                error
                  ? 'alert-circle-outline'
                  : warning
                    ? 'information-circle-outline'
                    : 'checkmark-circle-outline'
              }
              size={30}
              color={tone}
            />
            <Text accessibilityRole='header' style={styles.title}>
              {notice?.title}
            </Text>
            {!!notice?.message && (
              <Text style={styles.message}>{notice.message}</Text>
            )}
            <View style={styles.actions}>
              {buttons.map((button, index) => (
                <Pressable
                  key={index}
                  accessibilityRole='button'
                  onPress={() => finish(button)}
                  style={({ pressed }) => [
                    styles.button,
                    button.style === 'cancel'
                      ? styles.cancel
                      : button.style === 'destructive'
                        ? styles.destructive
                        : styles.primary,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'cancel' && { color: me.ink },
                    ]}
                  >
                    {button.text || 'OK'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,37,32,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.pop,
  },
  content: { padding: 24 },
  title: {
    fontFamily: me.font.display,
    color: me.ink,
    fontSize: 22,
    marginTop: 16,
    marginBottom: 12,
  },
  message: {
    fontFamily: me.font.body,
    color: me.ink2,
    fontSize: 16,
    lineHeight: 24,
  },
  actions: { marginTop: 24, gap: 10 },
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: me.radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: me.brand2 },
  cancel: { backgroundColor: me.bg2, borderWidth: 1, borderColor: me.line },
  destructive: { backgroundColor: me.errFg },
  buttonText: {
    color: me.onBrand,
    fontFamily: me.font.bodySemiBold,
    fontSize: 16,
    textAlign: 'center',
  },
});
