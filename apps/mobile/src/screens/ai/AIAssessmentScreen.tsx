import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/shared';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { RootStackParamList } from '../../navigation/types';

interface AnalysisResult {
  damageType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedCostMin: number;
  estimatedCostMax: number;
  recommendedActions: string[];
  category: string;
  confidence: number;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#ECFDF5', text: '#047857' },
  medium: { bg: '#FEF9C3', text: '#A16207' },
  high: { bg: '#FEF3C7', text: '#B45309' },
  critical: { bg: '#FEE2E2', text: '#DC2626' },
};

export const AIAssessmentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      formData.append('photo', {
        uri,
        type: 'image/jpeg',
        name: 'assessment.jpg',
      } as unknown as Blob);

      return mobileApiClient.postFormData<{ analysis: AnalysisResult }>(
        '/api/ai/analyze',
        formData
      );
    },
    onSuccess: (data) => {
      setResult(data.analysis);
    },
    onError: (err: Error) => {
      Alert.alert('Analysis Failed', err.message || 'Could not analyze the image. Please try again.');
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll access is needed to select photos.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const uri = pickerResult.assets[0].uri;
      setImageUri(uri);
      setResult(null);
      analyzeMutation.mutate(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const uri = pickerResult.assets[0].uri;
      setImageUri(uri);
      setResult(null);
      analyzeMutation.mutate(uri);
    }
  };

  const handleCreateJob = () => {
    navigation.navigate('Main', {
      screen: 'JobsTab',
      params: { screen: 'JobPosting' },
    } as never);
  };

  const formatCost = (amount: number) =>
    `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="AI Assessment" showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {!imageUri ? (
          <View style={styles.uploadSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={48} color='#717171' />
            </View>
            <Text style={styles.uploadTitle}>Analyze Property Damage</Text>
            <Text style={styles.uploadDescription}>
              Take a photo or choose from your gallery to get an AI-powered damage assessment
              with cost estimates.
            </Text>
            <View style={styles.buttonRow}>
              <Button variant="primary" onPress={takePhoto} leftIcon="camera" style={styles.actionBtn}>
                Take Photo
              </Button>
              <Button variant="outline" onPress={pickImage} leftIcon="images" style={styles.actionBtn}>
                Gallery
              </Button>
            </View>
          </View>
        ) : (
          <>
            <Card variant="elevated" padding="sm" style={styles.imageCard}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <Button
                variant="ghost"
                size="sm"
                onPress={() => { setImageUri(null); setResult(null); }}
                style={styles.retakeBtn}
              >
                Choose Different Photo
              </Button>
            </Card>

            {analyzeMutation.isPending && (
              <Card variant="elevated" padding="md" style={styles.loadingCard}>
                <Ionicons name="sparkles" size={24} color='#717171' />
                <Text style={styles.loadingText}>Analyzing image...</Text>
              </Card>
            )}

            {result && (
              <>
                <Card variant="elevated" padding="md" style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>Assessment Result</Text>
                    <Badge
                      variant={result.severity === 'low' ? 'success' : result.severity === 'critical' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {result.severity.toUpperCase()}
                    </Badge>
                  </View>

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Damage Type</Text>
                    <Text style={styles.resultValue}>{result.damageType}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Category</Text>
                    <Text style={styles.resultValue}>{result.category}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Estimated Cost</Text>
                    <Text style={[styles.resultValue, { color: theme.colors.textPrimary }]}>
                      {formatCost(result.estimatedCostMin)} - {formatCost(result.estimatedCostMax)}
                    </Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Confidence</Text>
                    <Text style={styles.resultValue}>{Math.round(result.confidence * 100)}%</Text>
                  </View>
                </Card>

                {result.recommendedActions.length > 0 && (
                  <Card variant="elevated" padding="md" style={styles.actionsCard}>
                    <Text style={styles.actionsTitle}>Recommended Actions</Text>
                    {result.recommendedActions.map((action, idx) => (
                      <View key={idx} style={styles.actionItem}>
                        <Ionicons name="checkmark-circle" size={18} color='#717171' />
                        <Text style={styles.actionText}>{action}</Text>
                      </View>
                    ))}
                  </Card>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleCreateJob}
                  leftIcon="add-circle"
                  style={styles.createJobBtn}
                >
                  Create Job from Assessment
                </Button>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollView: { flex: 1 },
  content: {
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing[10],
  },
  uploadSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing[10],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[5],
  },
  uploadTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  uploadDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * 1.5,
    marginBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  actionBtn: {
    minWidth: 140,
  },
  imageCard: {
    marginBottom: theme.spacing[4],
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: theme.borderRadius.base,
  },
  retakeBtn: {
    alignSelf: 'center',
    marginTop: theme.spacing[2],
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  resultCard: {
    marginBottom: theme.spacing[4],
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  resultLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  resultValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  actionsCard: {
    marginBottom: theme.spacing[6],
  },
  actionsTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  actionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: theme.typography.fontSize.sm * 1.5,
  },
  createJobBtn: {
    marginTop: theme.spacing[2],
  },
});

export default AIAssessmentScreen;
