import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface RunButtonProps { onPress: () => void; disabled: boolean }

export const RunAssessmentButton: React.FC<RunButtonProps> = ({ onPress, disabled }) => (
  <TouchableOpacity style={styles.runAssessmentButton} onPress={onPress} disabled={disabled}>
    <Ionicons name='sparkles' size={24} color='#FFF' />
    <Text style={styles.runAssessmentText}>Run AI Building Assessment</Text>
    <Text style={styles.runAssessmentSubtext}>GPT-4 Vision + YOLO + SAM3 + Bayesian Fusion</Text>
  </TouchableOpacity>
);

export const LoadingState: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size='large' color={theme.colors.primary} />
    <Text style={styles.loadingText}>Analyzing with advanced AI...</Text>
    <Text style={styles.loadingSubtext}>Running multiple AI models in parallel</Text>
  </View>
);

const styles = StyleSheet.create({
  runAssessmentButton: { backgroundColor: theme.colors.primary, padding: 20, borderRadius: 12, alignItems: 'center', marginVertical: 8 },
  runAssessmentText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 8 },
  runAssessmentSubtext: { color: '#FFF', fontSize: 12, marginTop: 4, opacity: 0.8 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: theme.colors.textPrimary },
  loadingSubtext: { marginTop: 4, fontSize: 12, color: theme.colors.textSecondary },
});