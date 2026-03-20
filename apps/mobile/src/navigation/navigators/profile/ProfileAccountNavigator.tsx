import React from "react";

import ProfileScreen from "../../../screens/ProfileScreen";
import EditProfileScreen from "../../../screens/EditProfileScreen";
import NotificationSettingsScreen from "../../../screens/NotificationSettingsScreen";
import { PaymentMethodsScreen } from "../../../screens/payment-methods";
import AddPaymentMethodScreen from "../../../screens/AddPaymentMethodScreen";
import HelpCenterScreen from "../../../screens/HelpCenterScreen";
import { PropertiesScreen } from "../../../screens/properties/PropertiesScreen";
import { PropertyDetailScreen } from "../../../screens/properties/PropertyDetailScreen";
import { EditPropertyScreen } from "../../../screens/properties/EditPropertyScreen";
import { PropertyAssessmentScreen } from "../../../screens/assessment/PropertyAssessmentScreen";
import { AddPropertyScreen } from "../../../screens/properties/AddPropertyScreen";
import { VideoCaptureScreen } from "../../../screens/video-capture/VideoCaptureScreen";
import { VideoProcessingStatusScreen } from "../../../screens/video-capture/VideoProcessingStatusScreen";
import { JobPhotoUploadScreen } from "../../../screens/job-details/JobPhotoUploadScreen";
import { PaymentHistoryScreen } from "../../../screens/payment/PaymentHistoryScreen";
import { SubscriptionScreen } from "../../../screens/subscription/SubscriptionScreen";
import { FinancialsScreen } from "../../../screens/financials/FinancialsScreen";
import { SettingsHubScreen } from "../../../screens/settings/SettingsHubScreen";
import { BookingStatusScreen } from "../../../screens/booking/BookingStatusScreen";
import { InsuranceScreen } from "../../../screens/contractor/InsuranceScreen";
import { TeamScreen } from "../../../screens/contractor/TeamScreen";
import { MarketingScreen } from "../../../screens/contractor/MarketingScreen";
import { MarketInsightsScreen } from "../../../screens/contractor/MarketInsightsScreen";
// SocialScreen: ARCHIVED - social feature removed
import { ConnectionsScreen } from "../../../screens/contractor/ConnectionsScreen";
import { TrainingScreen } from "../../../screens/contractor/TrainingScreen";
// HelpCenterScreen from ../../../screens/help/ available but using existing root-level HelpCenterScreen
import { FavoritesScreen } from "../../../screens/favorites/FavoritesScreen";
import { DiscoverScreen } from "../../../screens/discover/DiscoverScreen";
import { MFASecurityScreen } from "../../../screens/settings/MFASecurityScreen";
import { DataExportScreen } from "../../../screens/settings/DataExportScreen";
import { DeleteAccountScreen } from "../../../screens/settings/DeleteAccountScreen";
// PortfolioGalleryScreen: ARCHIVED - portfolio feature removed
import { EscrowDashboardScreen } from "../../../screens/payment/EscrowDashboardScreen";
import { withScreenErrorBoundary } from "../../../components/ErrorBoundaryProvider";

export const SafeProfileScreen = withScreenErrorBoundary(ProfileScreen, "Profile", { fallbackRoute: "Main" });
export const SafeEditProfileScreen = withScreenErrorBoundary(EditProfileScreen, "Edit Profile", { fallbackRoute: "ProfileMain" });
export const SafeNotificationSettingsScreen = withScreenErrorBoundary(NotificationSettingsScreen, "Notification Settings", { fallbackRoute: "ProfileMain" });
export const SafePaymentMethodsScreen = withScreenErrorBoundary(PaymentMethodsScreen, "Payment Methods", { fallbackRoute: "ProfileMain" });
export const SafeAddPaymentMethodScreen = withScreenErrorBoundary(AddPaymentMethodScreen, "Add Payment Method", { fallbackRoute: "PaymentMethods" });
export const SafeHelpCenterScreen = withScreenErrorBoundary(HelpCenterScreen, "Help Center", { fallbackRoute: "ProfileMain" });
export const SafePropertiesScreen = withScreenErrorBoundary(PropertiesScreen, "Properties", { fallbackRoute: "ProfileMain" });
export const SafePropertyDetailScreen = withScreenErrorBoundary(PropertyDetailScreen, "Property Detail", { fallbackRoute: "Properties" });
export const SafeEditPropertyScreen = withScreenErrorBoundary(EditPropertyScreen, "Edit Property", { fallbackRoute: "PropertyDetail" });
export const SafePropertyAssessmentScreen = withScreenErrorBoundary(PropertyAssessmentScreen as unknown as React.ComponentType<Record<string, unknown>>, "Property Assessment", { fallbackRoute: "PropertyDetail" });
export const SafeVideoCaptureScreen = withScreenErrorBoundary(VideoCaptureScreen as unknown as React.ComponentType<Record<string, unknown>>, "Video Capture", { fallbackRoute: "PropertyAssessment" });
export const SafeVideoProcessingStatusScreen = withScreenErrorBoundary(VideoProcessingStatusScreen as unknown as React.ComponentType<Record<string, unknown>>, "Video Processing", { fallbackRoute: "PropertyAssessment" });
export const SafeJobPhotoUploadScreen = withScreenErrorBoundary(JobPhotoUploadScreen as unknown as React.ComponentType<Record<string, unknown>>, "Photo Upload", { fallbackRoute: "PropertyAssessment" });
export const SafeAddPropertyScreen = withScreenErrorBoundary(AddPropertyScreen, "Add Property", { fallbackRoute: "Properties" });
export const SafePaymentHistoryScreen = withScreenErrorBoundary(PaymentHistoryScreen, "Payment History", { fallbackRoute: "ProfileMain" });
export const SafeSubscriptionScreen = withScreenErrorBoundary(SubscriptionScreen, "Subscription", { fallbackRoute: "ProfileMain" });
export const SafeFinancialsScreen = withScreenErrorBoundary(FinancialsScreen, "Financials", { fallbackRoute: "ProfileMain" });
export const SafeSettingsHubScreen = withScreenErrorBoundary(SettingsHubScreen, "Settings", { fallbackRoute: "ProfileMain" });
export const SafeBookingStatusScreen = withScreenErrorBoundary(BookingStatusScreen, "Booking Status", { fallbackRoute: "ProfileMain" });
export const SafeInsuranceScreen = withScreenErrorBoundary(InsuranceScreen, "Insurance", { fallbackRoute: "ProfileMain" });
export const SafeTeamScreen = withScreenErrorBoundary(TeamScreen, "Team", { fallbackRoute: "ProfileMain" });
export const SafeMarketingScreen = withScreenErrorBoundary(MarketingScreen, "Marketing", { fallbackRoute: "ProfileMain" });
export const SafeMarketInsightsScreen = withScreenErrorBoundary(MarketInsightsScreen, "Market Insights", { fallbackRoute: "ProfileMain" });
// SafeSocialScreen: ARCHIVED - social feature removed
export const SafeConnectionsScreen = withScreenErrorBoundary(ConnectionsScreen, "Connections", { fallbackRoute: "ProfileMain" });
export const SafeTrainingScreen = withScreenErrorBoundary(TrainingScreen, "Training", { fallbackRoute: "ProfileMain" });
export const SafeFavoritesScreen = withScreenErrorBoundary(FavoritesScreen, "Favorites", { fallbackRoute: "ProfileMain" });
export const SafeDiscoverScreen = withScreenErrorBoundary(DiscoverScreen, "Discover", { fallbackRoute: "ProfileMain" });
export const SafeMFASecurityScreen = withScreenErrorBoundary(MFASecurityScreen, "MFA Security", { fallbackRoute: "SettingsHub" });
export const SafeDataExportScreen = withScreenErrorBoundary(DataExportScreen, "Data Export", { fallbackRoute: "SettingsHub" });
export const SafeDeleteAccountScreen = withScreenErrorBoundary(DeleteAccountScreen, "Delete Account", { fallbackRoute: "SettingsHub" });
// SafePortfolioGalleryScreen: ARCHIVED - portfolio feature removed
export const SafeEscrowDashboardScreen = withScreenErrorBoundary(EscrowDashboardScreen, "Escrow Dashboard", { fallbackRoute: "ProfileMain" });
