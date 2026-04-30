import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ViewStyle,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../components/shared';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import type { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { analyzeWithMintAI, type AnalysisResult } from './analyzeWithMintAI';

export const AIAssessmentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // Tracks how long the current analysis has been running. Mint AI on
  // scale-to-zero infra has a ~60-90s cold start on the first request of
  // the day; we update the label after 10s / 30s so the user understands
  // the wait is expected behaviour, not a stuck request.
  const [analysisElapsedMs, setAnalysisElapsedMs] = useState(0);

  const analyzeMutation = useMutation({
    // Routes through /api/building-surveyor/assess → AssessmentGenerator
    // → Mint AI (shadow mode) + GPT-4o fallback. See analyzeWithMintAI.ts.
    mutationFn: analyzeWithMintAI,
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: Error) => {
      const isAuth =
        err.message?.includes('401') ||
        err.message?.toLowerCase().includes('unauthorized');
      Alert.alert(
        isAuth ? 'Session Expired' : 'Analysis Failed',
        isAuth
          ? 'Please sign in again to run an AI assessment.'
          : err.message || 'Could not analyze the image. Please try again.'
      );
    },
  });

  // Tick the elapsed counter every second while analysis is pending.
  // Declared AFTER analyzeMutation so we don't hit a TDZ on the
  // `analyzeMutation.isPending` read (previous ordering tripped strict tsc).
  useEffect(() => {
    if (!analyzeMutation.isPending) {
      setAnalysisElapsedMs(0);
      return;
    }
    const started = Date.now();
    const interval = setInterval(() => {
      setAnalysisElapsedMs(Date.now() - started);
    }, 1000);
    return () => clearInterval(interval);
  }, [analyzeMutation.isPending]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('permissions.gallery.title'),
        t('permissions.gallery.message')
      );
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
      Alert.alert(
        t('permissions.camera.title'),
        t('permissions.camera.message')
      );
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
    // 2026-04-30 audit P1: replaces `as never` cast. Navigates to the
    // Jobs tab's JobPosting screen — the typed root navigator accepts
    // this nested shape directly.
    navigation.navigate('Main', {
      screen: 'JobsTab',
      params: { screen: 'JobPosting' },
    });
  };

  const formatCost = (amount: number) =>
    `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <ScreenHeader
        title='AI Assessment'
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {!imageUri ? (
          <View style={styles.uploadSection}>
            <View style={styles.iconCircle}>
              <Ionicons
                name='camera-outline'
                size={48}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text style={styles.uploadTitle}>Analyze Property Damage</Text>
            <Text style={styles.uploadDescription}>
              Take a photo or choose from your gallery to get an AI-powered
              damage assessment with cost estimates.
            </Text>
            <View style={styles.buttonRow}>
              <Button
                variant='primary'
                onPress={takePhoto}
                title='Take Photo'
                style={styles.actionBtn as ViewStyle}
              />
              <Button
                variant='secondary'
                onPress={pickImage}
                title='Gallery'
                style={styles.actionBtn as ViewStyle}
              />
            </View>
          </View>
        ) : (
          <>
            <Card variant='elevated' padding='sm' style={styles.imageCard}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <Button
                variant='ghost'
                size='sm'
                onPress={() => {
                  setImageUri(null);
                  setResult(null);
                }}
                style={styles.retakeBtn}
              >
                Choose Different Photo
              </Button>
            </Card>

            {analyzeMutation.isPending && (
              <Card variant='elevated' padding='md' style={styles.loadingCard}>
                <Ionicons name='sparkles' size={24} color='#8B5CF6' />
                <Text style={styles.loadingText}>
                  {analysisElapsedMs < 10_000
                    ? 'Analyzing image...'
                    : analysisElapsedMs < 30_000
                      ? 'Still analyzing — first request of the session takes longer...'
                      : 'Warming up the AI (this only happens once per hour) — hang on...'}
                </Text>
              </Card>
            )}

            {result && (
              <>
                <Card variant='elevated' padding='md' style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>Assessment Result</Text>
                    <Badge
                      variant={
                        result.severity === 'early'
                          ? 'success'
                          : result.severity === 'dangerous'
                            ? 'error'
                            : 'warning'
                      }
                      size='sm'
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
                    <Text
                      style={[
                        styles.resultValue,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {formatCost(result.estimatedCostMin)} -{' '}
                      {formatCost(result.estimatedCostMax)}
                    </Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Confidence</Text>
                    <Text style={styles.resultValue}>
                      {Math.round(result.confidence * 100)}%
                    </Text>
                  </View>
                </Card>

                {result.recommendedActions.length > 0 && (
                  <Card
                    variant='elevated'
                    padding='md'
                    style={styles.actionsCard}
                  >
                    <Text style={styles.actionsTitle}>Recommended Actions</Text>
                    {result.recommendedActions.map((action, idx) => (
                      <View key={idx} style={styles.actionItem}>
                        <Ionicons
                          name='checkmark-circle'
                          size={18}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.actionText}>{action}</Text>
                      </View>
                    ))}
                  </Card>
                )}

                <Button
                  variant='primary'
                  fullWidth
                  onPress={handleCreateJob}
                  title='Create Job from Assessment'
                  style={styles.createJobBtn as ViewStyle}
                />
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
    padding: 20,
    paddingBottom: 40,
  },
  uploadSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    minWidth: 140,
  },
  imageCard: {
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  retakeBtn: {
    alignSelf: 'center',
    marginTop: 8,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  resultCard: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  resultLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  resultValue: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  actionsCard: {
    marginBottom: 24,
  },
  actionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  createJobBtn: {
    marginTop: 8,
  },
});
