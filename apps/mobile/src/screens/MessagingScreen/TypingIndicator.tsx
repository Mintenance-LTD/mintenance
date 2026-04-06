import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './styles';

interface TypingIndicatorProps {
  otherUserName: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ otherUserName }) => (
  <View style={styles.typingRow}>
    <View style={styles.typingBubble}>
      <View style={styles.typingDots}>
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>
      <Text style={styles.typingName}>{otherUserName}</Text>
    </View>
  </View>
);
