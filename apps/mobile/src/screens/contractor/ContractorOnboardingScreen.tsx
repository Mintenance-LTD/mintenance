/**
 * ContractorOnboardingScreen
 *
 * First-time setup wizard for new contractors. Shows completion
 * checklist and guides them through essential setup steps.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  isComplete: boolean;
}

export const ContractorOnboardingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { user } = useAuth();

  // Determine completion based on user profile fields
  const hasProfile = !!(user?.first_name && user?.last_name);
  const hasCompany = !!user?.company_name;
  const hasPhone = !!user?.phone;

  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your name, photo, and bio so homeowners can learn about you',
      icon: 'person-outline',
      screen: 'EditProfile',
      isComplete: hasProfile,
    },
    {
      id: 'business',
      title: 'Business Details',
      description: 'Add your company name, address, and contact info',
      icon: 'business-outline',
      screen: 'ContractorCardEditor',
      isComplete: hasCompany && hasPhone,
    },
    {
      id: 'service_areas',
      title: 'Set Service Areas',
      description: 'Define where you work so nearby homeowners can find you',
      icon: 'map-outline',
      screen: 'ServiceAreas',
      isComplete: false, // Can't easily check without API call
    },
    {
      id: 'certifications',
      title: 'Add Certifications',
      description: 'Upload your qualifications, licenses, and insurance',
      icon: 'ribbon-outline',
      screen: 'Certifications',
      isComplete: false,
    },
    {
      id: 'verification',
      title: 'Get Verified',
      description: 'Complete identity verification to build trust with homeowners',
      icon: 'shield-checkmark-outline',
      screen: 'ContractorVerification',
      isComplete: false,
    },
    {
      id: 'payment',
      title: 'Set Up Payouts',
      description: 'Connect your bank account to receive payments',
      icon: 'card-outline',
      screen: 'Payouts',
      isComplete: false,
    },
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const progress = completedCount / steps.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome to Mintenance</Text>
          <Text style={styles.subtitle}>
            Complete these steps to start receiving jobs from homeowners
          </Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {completedCount}/{steps.length} complete
            </Text>
          </View>
        </View>

        <View style={styles.stepsList}>
          {steps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={styles.stepCard}
              onPress={() => navigation.navigate('ProfileTab', { screen: step.screen })}
              accessibilityRole="button"
              accessibilityLabel={`${step.title}${step.isComplete ? ' - completed' : ''}`}
            >
              <View style={[styles.stepNumber, step.isComplete && styles.stepNumberComplete]}>
                {step.isComplete ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                )}
              </View>

              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, step.isComplete && styles.stepTitleComplete]}>
                  {step.title}
                </Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stepsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberComplete: {
    backgroundColor: theme.colors.primary,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  stepTitleComplete: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  stepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  skipText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

export default ContractorOnboardingScreen;
