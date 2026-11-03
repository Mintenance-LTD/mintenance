import React from 'react';
import { Modal, ScrollView, View, Text, Pressable, Share } from 'react-native';
import {
  CUSTOMER_TERMS_TEXT,
  CUSTOMER_TERMS_VERSION,
} from '@mintenance/shared';
export function CustomerTerms({
  visible,
  onClose,
  title = `Customer terms ${CUSTOMER_TERMS_VERSION}`,
  document = CUSTOMER_TERMS_TEXT,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  document?: string;
}) {
  return (
    <Modal visible={visible} animationType='slide' onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          padding: 24,
          paddingTop: 60,
          backgroundColor: '#fff',
        }}
      >
        <Text
          accessibilityRole='header'
          style={{ fontSize: 22, fontWeight: '600' }}
        >
          {title}
        </Text>
        <ScrollView>
          <Text
            selectable
            style={{ fontSize: 16, lineHeight: 25, paddingVertical: 20 }}
          >
            {document}
          </Text>
        </ScrollView>
        <Pressable
          accessibilityRole='button'
          onPress={() => void Share.share({ message: document })}
          style={{ padding: 14 }}
        >
          <Text>Save or share a copy</Text>
        </Pressable>
        <Pressable
          accessibilityRole='button'
          onPress={onClose}
          style={{ padding: 14 }}
        >
          <Text>Close document</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
