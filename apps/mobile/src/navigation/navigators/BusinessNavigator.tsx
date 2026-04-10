/**
 * BusinessNavigator — Contractor-only tab for business management tools.
 *
 * Gives contractors 1-tap access to CRM, invoices, quotes, finance,
 * expenses, time tracking, reporting, and other business tools that
 * were previously buried 3 levels deep in ProfileNavigator.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../types';

// Business-related screen wrappers (same as used in ProfileNavigator)
import {
  SafeInvoiceManagementScreen,
  SafeCreateInvoiceScreen,
  SafeInvoiceDetailScreen,
  SafeCRMDashboardScreen,
  SafeAddClientScreen,
  SafeClientDetailScreen,
  SafeFinanceDashboardScreen,
  SafeServiceAreasScreen,
  SafeQuoteBuilderScreen,
  SafeCreateQuoteScreen,
  SafeQuoteDetailScreen,
  SafeQuoteTemplatesScreen,
  SafeContractorCardEditorScreen,
  SafeContractorVerificationScreen,
  SafeCalendarScreen,
  SafeReviewsScreen,
  SafeExpensesScreen,
  SafeDocumentsScreen,
  SafeCertificationsScreen,
  SafeTimeTrackingScreen,
  SafeAddTimeEntryScreen,
  SafeAddCertificationScreen,
  SafeReportingScreen,
  SafePayoutsScreen,
} from './profile/ProfileBusinessNavigator';

import {
  SafeInsuranceScreen,
  SafeTeamScreen,
  SafeMarketingScreen,
  SafeMarketInsightsScreen,
  SafeEscrowDashboardScreen,
} from './profile/ProfileAccountNavigator';

// Use a subset of ProfileStackParamList so screens can share types
const BusinessStack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * BusinessHub — the initial screen shown when contractor taps "Business" tab.
 * Displays a grid of business tool shortcuts.
 */
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme, gradients } from '../../theme';

interface ToolItem {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  screen: string;
}

const TOOLS: ToolItem[] = [
  {
    label: 'Finance',
    subtitle: 'Dashboard & analytics',
    icon: 'analytics',
    iconColor: '#059669',
    bgColor: '#D1FAE5',
    screen: 'FinanceDashboard',
  },
  {
    label: 'Invoices',
    subtitle: 'Create & manage',
    icon: 'receipt',
    iconColor: '#8B5CF6',
    bgColor: '#EDE9FE',
    screen: 'InvoiceManagement',
  },
  {
    label: 'Quotes',
    subtitle: 'Build estimates',
    icon: 'document-text',
    iconColor: '#EC4899',
    bgColor: '#FCE7F3',
    screen: 'QuoteBuilder',
  },
  {
    label: 'Clients',
    subtitle: 'CRM & contacts',
    icon: 'people',
    iconColor: '#3B82F6',
    bgColor: '#DBEAFE',
    screen: 'CRMDashboard',
  },
  {
    label: 'Expenses',
    subtitle: 'Track costs',
    icon: 'wallet',
    iconColor: '#EF4444',
    bgColor: '#FEE2E2',
    screen: 'Expenses',
  },
  {
    label: 'Payouts',
    subtitle: 'Earnings & transfers',
    icon: 'cash',
    iconColor: '#059669',
    bgColor: '#D1FAE5',
    screen: 'Payouts',
  },
  {
    label: 'Calendar',
    subtitle: 'Schedule & plan',
    icon: 'calendar',
    iconColor: '#06B6D4',
    bgColor: '#CFFAFE',
    screen: 'Calendar',
  },
  {
    label: 'Time',
    subtitle: 'Track hours',
    icon: 'time',
    iconColor: '#3B82F6',
    bgColor: '#DBEAFE',
    screen: 'TimeTracking',
  },
  {
    label: 'Reports',
    subtitle: 'Analytics & insights',
    icon: 'bar-chart',
    iconColor: '#8B5CF6',
    bgColor: '#EDE9FE',
    screen: 'Reporting',
  },
  {
    label: 'Documents',
    subtitle: 'Files & certs',
    icon: 'document',
    iconColor: '#6B7280',
    bgColor: '#F3F4F6',
    screen: 'Documents',
  },
  {
    label: 'Service Areas',
    subtitle: 'Coverage zones',
    icon: 'map',
    iconColor: '#06B6D4',
    bgColor: '#CFFAFE',
    screen: 'ServiceAreas',
  },
  {
    label: 'Escrow',
    subtitle: 'Held payments',
    icon: 'lock-closed',
    iconColor: '#D97706',
    bgColor: '#FEF3C7',
    screen: 'EscrowDashboard',
  },
];

const BusinessHubScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Business Hub</Text>
          <Text style={styles.headerTitle}>Business</Text>
          <Text style={styles.headerSubtitle}>
            Manage your contractor business with precision and efficiency.
          </Text>
        </View>

        {/* Tool Grid */}
        <View style={styles.grid}>
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.screen}
              style={styles.toolCard}
              onPress={() =>
                (navigation.navigate as (screen: string) => void)(tool.screen)
              }
              accessibilityRole='button'
              accessibilityLabel={`${tool.label}: ${tool.subtitle}`}
              activeOpacity={0.7}
            >
              <View style={styles.toolCardInner}>
                <View
                  style={[styles.iconWrap, { backgroundColor: tool.bgColor }]}
                >
                  <Ionicons name={tool.icon} size={26} color={tool.iconColor} />
                </View>
                <Text style={styles.toolLabel}>{tool.label}</Text>
                <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scale Your Operations CTA banner */}
        <LinearGradient
          colors={gradients.heroGreen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaBanner}
        >
          <View style={styles.ctaGlassCircle} />
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Scale Your Operations</Text>
            <Text style={styles.ctaSubtitle}>
              Optimise your workflow with all your business tools in one place.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() =>
                (navigation.navigate as (screen: string) => void)(
                  'FinanceDashboard'
                )
              }
              accessibilityRole='button'
              accessibilityLabel='View finance dashboard'
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>View Dashboard</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.ctaIconWrap}>
            <Ionicons name='rocket' size={48} color='rgba(255,255,255,0.9)' />
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    maxWidth: 300,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 0,
  },
  toolCard: {
    width: '50%',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  toolCardInner: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  toolLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  toolSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  // CTA Banner
  ctaBanner: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 28,
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  ctaGlassCircle: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ctaContent: {
    flex: 1,
    zIndex: 1,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  ctaIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    zIndex: 1,
  },
});

const BusinessNavigator = () => {
  return (
    <BusinessStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
      initialRouteName={'BusinessHub' as keyof ProfileStackParamList}
    >
      {/* Hub screen (initial) — uses FinanceDashboard route name but renders the hub grid */}
      <BusinessStack.Screen
        name={'BusinessHub' as keyof ProfileStackParamList}
        component={BusinessHubScreen}
      />
      {/* All business sub-screens */}
      <BusinessStack.Screen
        name='FinanceDashboard'
        component={SafeFinanceDashboardScreen}
      />
      <BusinessStack.Screen
        name='InvoiceManagement'
        component={SafeInvoiceManagementScreen}
      />
      <BusinessStack.Screen
        name='CreateInvoice'
        component={SafeCreateInvoiceScreen as React.ComponentType<object>}
        options={{ presentation: 'modal' }}
      />
      <BusinessStack.Screen
        name='InvoiceDetail'
        component={SafeInvoiceDetailScreen as React.ComponentType<object>}
      />
      <BusinessStack.Screen
        name='CRMDashboard'
        component={SafeCRMDashboardScreen}
      />
      <BusinessStack.Screen
        name='AddClient'
        component={SafeAddClientScreen}
        options={{ presentation: 'modal' }}
      />
      <BusinessStack.Screen
        name='ClientDetail'
        component={SafeClientDetailScreen as React.ComponentType<object>}
      />
      <BusinessStack.Screen
        name='QuoteBuilder'
        component={SafeQuoteBuilderScreen}
      />
      <BusinessStack.Screen
        name='CreateQuote'
        component={SafeCreateQuoteScreen}
        options={{ presentation: 'modal' }}
      />
      <BusinessStack.Screen
        name='QuoteDetail'
        component={SafeQuoteDetailScreen as React.ComponentType<object>}
      />
      <BusinessStack.Screen
        name='QuoteTemplates'
        component={SafeQuoteTemplatesScreen}
      />
      <BusinessStack.Screen name='Expenses' component={SafeExpensesScreen} />
      <BusinessStack.Screen name='Payouts' component={SafePayoutsScreen} />
      <BusinessStack.Screen name='Calendar' component={SafeCalendarScreen} />
      <BusinessStack.Screen
        name='TimeTracking'
        component={SafeTimeTrackingScreen}
      />
      <BusinessStack.Screen
        name='AddTimeEntry'
        component={SafeAddTimeEntryScreen}
        options={{ presentation: 'modal' }}
      />
      <BusinessStack.Screen name='Reporting' component={SafeReportingScreen} />
      <BusinessStack.Screen name='Documents' component={SafeDocumentsScreen} />
      <BusinessStack.Screen
        name='ServiceAreas'
        component={SafeServiceAreasScreen}
      />
      <BusinessStack.Screen
        name='Certifications'
        component={SafeCertificationsScreen}
      />
      <BusinessStack.Screen
        name='AddCertification'
        component={SafeAddCertificationScreen}
        options={{ presentation: 'modal' }}
      />
      <BusinessStack.Screen
        name='ContractorCardEditor'
        component={SafeContractorCardEditorScreen}
      />
      <BusinessStack.Screen
        name='ContractorVerification'
        component={SafeContractorVerificationScreen}
      />
      <BusinessStack.Screen name='Reviews' component={SafeReviewsScreen} />
      <BusinessStack.Screen name='Insurance' component={SafeInsuranceScreen} />
      <BusinessStack.Screen name='Team' component={SafeTeamScreen} />
      <BusinessStack.Screen name='Marketing' component={SafeMarketingScreen} />
      <BusinessStack.Screen
        name='MarketInsights'
        component={SafeMarketInsightsScreen}
      />
      <BusinessStack.Screen
        name='EscrowDashboard'
        component={SafeEscrowDashboardScreen}
      />
    </BusinessStack.Navigator>
  );
};

export default BusinessNavigator;
