import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

export function PropertySegments<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={workspaceStyles.segments}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          accessible
          accessibilityLabel={option.label}
          accessibilityRole='tab'
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={[
            workspaceStyles.segment,
            value === option.value && workspaceStyles.selected,
          ]}
        >
          <Text
            style={[
              workspaceStyles.segmentText,
              value === option.value && workspaceStyles.selectedText,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Keep edits in memory when switching between property subsections. */
export function PropertyPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <View style={{ display: active ? 'flex' : 'none' }} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>{children}</View>;
}

export function PropertySheet({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      visible
      transparent
      animationType='slide'
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={workspaceStyles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView edges={['bottom']} style={workspaceStyles.sheet}>
          <View style={workspaceStyles.handle} />
          <View style={workspaceStyles.sheetHeader}>
            <Text accessibilityRole='header' style={workspaceStyles.heading}>
              {title}
            </Text>
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel={`Close ${title}`}
              disabled={busy}
              onPress={onClose}
              style={workspaceStyles.iconButton}
            >
              <Ionicons name='close' size={24} color={me.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={workspaceStyles.sheetContent}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const workspaceStyles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    backgroundColor: me.surface,
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: me.line2,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 6,
  },
  segmentText: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '500',
    textAlign: 'center',
  },
  selected: { backgroundColor: me.brandSoft },
  selectedText: { color: me.brand2, fontWeight: '700' },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: me.line,
    padding: 16,
    marginBottom: 14,
  },
  heading: { fontSize: 20, fontWeight: '700', color: me.ink, flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: me.ink },
  muted: { color: me.ink2, fontSize: 13, lineHeight: 19 },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: me.line,
    backgroundColor: me.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: me.ink,
    fontSize: 15,
    marginBottom: 12,
  },
  primary: {
    minHeight: 48,
    backgroundColor: me.brand2,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  primaryText: { color: me.onBrand, fontWeight: '700', fontSize: 15 },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: { flex: 1, backgroundColor: '#1A252066', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%',
    backgroundColor: me.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: me.line,
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 24 },
});
