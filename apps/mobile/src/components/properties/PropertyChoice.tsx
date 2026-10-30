import React, { useState, type ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { me } from '../../design-system/mint-editorial';

/** Compact trigger with a scrollable, dismissible native chooser. */
export function PropertyChoice({
  label,
  value,
  options,
  onChange,
  disabled = false,
  children,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  children?: (dismiss: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <>
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel={`${label}: ${selected?.label ?? value}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Text style={styles.label}>{selected?.label ?? value}</Text>
        <Text
          accessibilityElementsHidden
          importantForAccessibility='no'
          style={styles.label}
        >
          ⌄
        </Text>
      </TouchableOpacity>
      {open && (
        <Modal
          visible={open}
          transparent
          animationType='fade'
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.backdrop}>
            <SafeAreaView style={styles.sheet} accessibilityViewIsModal>
              <View style={styles.heading}>
                <Text accessibilityRole='header' style={styles.title}>
                  {label}
                </Text>
                <TouchableOpacity
                  accessibilityRole='button'
                  accessibilityLabel={`Close ${label}`}
                  onPress={() => setOpen(false)}
                  style={styles.close}
                >
                  <Text style={styles.label}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.options}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    accessibilityRole='radio'
                    accessibilityState={{ checked: value === option.value }}
                    style={styles.option}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.label}>{option.label}</Text>
                    {value === option.value && (
                      <Text
                        style={styles.label}
                        accessibilityElementsHidden
                        importantForAccessibility='no'
                      >
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                {children?.(() => setOpen(false))}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: me.line,
    backgroundColor: me.surface,
  },
  label: { color: me.brand2, fontWeight: '600', fontSize: 14, flexShrink: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: me.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  options: { paddingHorizontal: 20, paddingBottom: 20 },
  heading: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  title: { color: me.ink, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  close: {
    minHeight: 44,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: me.line,
  },
});
