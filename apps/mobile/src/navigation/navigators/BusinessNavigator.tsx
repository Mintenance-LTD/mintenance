/**
 * BusinessNavigator — Contractor-only tab for business management tools.
 *
 * Gives contractors 1-tap access to CRM, invoices, quotes, finance,
 * expenses, time tracking, reporting, and other business tools that
 * were previously buried 3 levels deep in ProfileNavigator.
 *
 * The hub itself lives in `screens/business-hub/` — see the comment
 * block on `BusinessHubScreen` for the split rationale.
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
  SafeQuickQuoteScreen,
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

import { BusinessHubScreen } from '../../screens/business-hub/BusinessHubScreen';

// Use a subset of ProfileStackParamList so screens can share types
const BusinessStack = createNativeStackNavigator<ProfileStackParamList>();

const BusinessNavigator = () => {
  return (
    <BusinessStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
      initialRouteName='BusinessHub'
    >
      {/* Hub screen (initial) — the contractor business tools grid */}
      <BusinessStack.Screen name='BusinessHub' component={BusinessHubScreen} />
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
        name='QuickQuote'
        component={SafeQuickQuoteScreen}
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
