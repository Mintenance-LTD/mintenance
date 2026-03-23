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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business</Text>
        <Text style={styles.headerSubtitle}>
          Manage your contractor business
        </Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.screen}
            style={styles.toolCard}
            onPress={() =>
              (navigation.navigate as (screen: string) => void)(tool.screen)
            }
            accessibilityRole='button'
            accessibilityLabel={tool.label}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: tool.bgColor }]}>
              <Ionicons name={tool.icon} size={24} color={tool.iconColor} />
            </View>
            <Text style={styles.toolLabel}>{tool.label}</Text>
            <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  toolCard: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  toolSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});

export const BusinessNavigator = () => {
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
