import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../types";

// Account-related screen wrappers
import {
  SafeProfileScreen, SafeEditProfileScreen, SafeNotificationSettingsScreen,
  SafePaymentMethodsScreen, SafeAddPaymentMethodScreen, SafeHelpCenterScreen,
  SafePropertiesScreen, SafePropertyDetailScreen, SafeEditPropertyScreen, SafePropertyAssessmentScreen,
  SafeVideoCaptureScreen, SafeVideoProcessingStatusScreen, SafeJobPhotoUploadScreen,
  SafeAddPropertyScreen, SafePaymentHistoryScreen, SafeSubscriptionScreen,
  SafeFinancialsScreen, SafeSettingsHubScreen, SafeBookingStatusScreen,
  SafeInsuranceScreen, SafeTeamScreen, SafeMarketingScreen, SafeMarketInsightsScreen,
  SafeConnectionsScreen, SafeTrainingScreen,
  SafeFavoritesScreen, SafeDiscoverScreen,
  SafeMFASecurityScreen, SafeDataExportScreen, SafeDeleteAccountScreen,
  SafeEscrowDashboardScreen,
} from "./profile/ProfileAccountNavigator";

// Business-related screen wrappers
import {
  SafeInvoiceManagementScreen, SafeCreateInvoiceScreen, SafeInvoiceDetailScreen,
  SafeCRMDashboardScreen, SafeAddClientScreen, SafeClientDetailScreen,
  SafeFinanceDashboardScreen, SafeServiceAreasScreen, SafeQuoteBuilderScreen,
  SafeCreateQuoteScreen, SafeQuoteDetailScreen, SafeQuoteTemplatesScreen,
  SafeContractorCardEditorScreen, SafeContractorVerificationScreen,
  SafeCalendarScreen, SafeReviewsScreen, SafeExpensesScreen, SafeDocumentsScreen,
  SafeCertificationsScreen, SafeTimeTrackingScreen, SafeAddTimeEntryScreen,
  SafeAddCertificationScreen, SafeReportingScreen, SafePayoutsScreen,
} from "./profile/ProfileBusinessNavigator";

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true, animation: "slide_from_right" }} initialRouteName="ProfileMain">
      <ProfileStack.Screen name="ProfileMain" component={SafeProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="EditProfile" component={SafeEditProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="NotificationSettings" component={SafeNotificationSettingsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="PaymentMethods" component={SafePaymentMethodsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="AddPaymentMethod" component={SafeAddPaymentMethodScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="HelpCenter" component={SafeHelpCenterScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="InvoiceManagement" component={SafeInvoiceManagementScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="CreateInvoice" component={SafeCreateInvoiceScreen as React.ComponentType<object>} options={{ headerShown: false, presentation: "modal" }} />
      <ProfileStack.Screen name="InvoiceDetail" component={SafeInvoiceDetailScreen as React.ComponentType<object>} options={{ headerShown: false }} />
      <ProfileStack.Screen name="CRMDashboard" component={SafeCRMDashboardScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="AddClient" component={SafeAddClientScreen} options={{ headerShown: false, presentation: "modal" }} />
      <ProfileStack.Screen name="ClientDetail" component={SafeClientDetailScreen as React.ComponentType<object>} options={{ headerShown: false }} />
      <ProfileStack.Screen name="FinanceDashboard" component={SafeFinanceDashboardScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="ServiceAreas" component={SafeServiceAreasScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="QuoteBuilder" component={SafeQuoteBuilderScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="CreateQuote" component={SafeCreateQuoteScreen} options={{ presentation: "modal" }} />
      <ProfileStack.Screen name="QuoteDetail" component={SafeQuoteDetailScreen as React.ComponentType<object>} options={{ headerShown: false }} />
      <ProfileStack.Screen name="QuoteTemplates" component={SafeQuoteTemplatesScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="ContractorCardEditor" component={SafeContractorCardEditorScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="ContractorVerification" component={SafeContractorVerificationScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Properties" component={SafePropertiesScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="PropertyDetail" component={SafePropertyDetailScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="EditProperty" component={SafeEditPropertyScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="PropertyAssessment" component={SafePropertyAssessmentScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="VideoCapture" component={SafeVideoCaptureScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="VideoProcessingStatus" component={SafeVideoProcessingStatusScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="PhotoUpload" component={SafeJobPhotoUploadScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="AddProperty" component={SafeAddPropertyScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Calendar" component={SafeCalendarScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Reviews" component={SafeReviewsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="PaymentHistory" component={SafePaymentHistoryScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Subscription" component={SafeSubscriptionScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Financials" component={SafeFinancialsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="SettingsHub" component={SafeSettingsHubScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Expenses" component={SafeExpensesScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Documents" component={SafeDocumentsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Certifications" component={SafeCertificationsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="AddCertification" component={SafeAddCertificationScreen} options={{ headerShown: false, presentation: "modal" }} />
      <ProfileStack.Screen name="TimeTracking" component={SafeTimeTrackingScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="AddTimeEntry" component={SafeAddTimeEntryScreen} options={{ headerShown: false, presentation: "modal" }} />
      <ProfileStack.Screen name="Reporting" component={SafeReportingScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Payouts" component={SafePayoutsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="BookingStatus" component={SafeBookingStatusScreen as React.ComponentType<object>} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Insurance" component={SafeInsuranceScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Team" component={SafeTeamScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Marketing" component={SafeMarketingScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="MarketInsights" component={SafeMarketInsightsScreen} options={{ headerShown: false }} />
      {/* Social: ARCHIVED - social feature removed */}
      <ProfileStack.Screen name="Connections" component={SafeConnectionsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Training" component={SafeTrainingScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Favorites" component={SafeFavoritesScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Discover" component={SafeDiscoverScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="MFASecurity" component={SafeMFASecurityScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="DataExport" component={SafeDataExportScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="DeleteAccount" component={SafeDeleteAccountScreen} options={{ headerShown: false }} />
      {/* PortfolioGallery: ARCHIVED - portfolio feature removed */}
      <ProfileStack.Screen name="EscrowDashboard" component={SafeEscrowDashboardScreen} options={{ headerShown: false }} />
    </ProfileStack.Navigator>
  );
};

export default ProfileNavigator;