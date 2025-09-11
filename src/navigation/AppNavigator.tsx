import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useHaptics } from '../utils/haptics';

import { useAuth } from '../contexts/AuthContext';
import { 
  AppErrorBoundary,
  withScreenErrorBoundary 
} from '../components/ErrorBoundaryProvider';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import JobsScreen from '../screens/JobsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import JobPostingScreen from '../screens/JobPostingScreen';
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import JobDetailsScreen from '../screens/JobDetailsScreen';
import BidSubmissionScreen from '../screens/BidSubmissionScreen';
import FindContractorsScreen from '../screens/FindContractorsScreen';
import ContractorDiscoveryScreen from '../screens/ContractorDiscoveryScreen';
import ContractorSocialScreen from '../screens/ContractorSocialScreen';
import MessagesListScreen from '../screens/MessagesListScreen';
import MessagingScreen from '../screens/MessagingScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import InvoiceManagementScreen from '../screens/InvoiceManagementScreen';
import CRMDashboardScreen from '../screens/CRMDashboardScreen';
import FinanceDashboardScreen from '../screens/FinanceDashboardScreen';
import ServiceAreasScreen from '../screens/ServiceAreasScreen';
import QuoteBuilderScreen from '../screens/QuoteBuilderScreen';
import CreateQuoteScreen from '../screens/CreateQuoteScreen';
import { theme } from '../theme';

// Wrap screens with error boundaries
const SafeHomeScreen = withScreenErrorBoundary(HomeScreen, 'Home');
const SafeJobsScreen = withScreenErrorBoundary(JobsScreen, 'Jobs');
const SafeProfileScreen = withScreenErrorBoundary(ProfileScreen, 'Profile');
const SafeJobPostingScreen = withScreenErrorBoundary(JobPostingScreen, 'Job Posting', { fallbackRoute: 'Home' });
const SafeJobDetailsScreen = withScreenErrorBoundary(JobDetailsScreen, 'Job Details', { fallbackRoute: 'Jobs' });
const SafeMessagingScreen = withScreenErrorBoundary(MessagingScreen, 'Messaging', { fallbackRoute: 'Inbox' });
const SafeContractorDiscoveryScreen = withScreenErrorBoundary(ContractorDiscoveryScreen, 'Contractor Discovery', { fallbackRoute: 'Home' });
const SafePaymentMethodsScreen = withScreenErrorBoundary(PaymentMethodsScreen, 'Payment Methods', { fallbackRoute: 'Profile' });

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type HomeTabParamList = {
  Home: undefined;
  Feed: undefined;
  Add: undefined;
  Inbox: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Jobs: undefined;
  JobPosting: undefined;
  ServiceRequest: undefined;
  JobDetails: { jobId: string };
  BidSubmission: { jobId: string };
  FindContractors: undefined;
  ContractorDiscovery: undefined;
  Messaging: {
    jobId: string;
    jobTitle: string;
    otherUserId: string;
    otherUserName: string;
  };
  EditProfile: undefined;
  NotificationSettings: undefined;
  PaymentMethods: undefined;
  HelpCenter: undefined;
  InvoiceManagement: undefined;
  CRMDashboard: undefined;
  FinanceDashboard: undefined;
  CreateInvoice: undefined;
  InvoiceDetail: { invoiceId: string };
  ClientDetail: { clientId: string };
  AddClient: undefined;
  ClientChat: { clientId: string };
  FinanceReports: undefined;
  ServiceAreas: undefined;
  CreateServiceArea: undefined;
  EditServiceArea: { areaId: string };
  ServiceAreaDetail: { areaId: string };
  ServiceAreaAnalytics: undefined;
  RouteOptimization: undefined;
  CoverageMap: undefined;
  EmailTemplates: undefined;
  CreateEmailTemplate: undefined;
  EditEmailTemplate: { templateId: string };
  EmailTemplatePreview: { templateId: string };
  EmailAnalytics: undefined;
  QuoteBuilder: undefined;
  CreateQuote: { jobId?: string; clientName?: string; clientEmail?: string };
  EditQuote: { quoteId: string };
  QuoteDetail: { quoteId: string };
  QuoteTemplates: undefined;
  CreateQuoteTemplate: undefined;
  EditQuoteTemplate: { templateId: string };
  QuoteAnalytics: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStack.Navigator>
);

const AddButton = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const haptics = useHaptics();
  
  const handleAddPress = () => {
    haptics.buttonPress();
    if (user?.role === 'homeowner') {
      navigation.navigate('ServiceRequest');
    } else {
      // For contractors, navigate to Jobs screen to browse available work
      navigation.navigate('Jobs');
    }
  };

  return (
    <TouchableOpacity 
      style={styles.addButton} 
      onPress={handleAddPress}
      accessibilityRole="button"
      accessibilityLabel={user?.role === 'homeowner' ? "Create service request" : "Browse jobs"}
      accessibilityHint={user?.role === 'homeowner' ? "Double tap to create a new service request" : "Double tap to browse available jobs"}
    >
      <Ionicons name="add" size={24} color={theme.colors.textInverse} />
    </TouchableOpacity>
  );
};

const TabNavigator = () => {
  const { user } = useAuth();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary, // Dark blue
        tabBarInactiveTintColor: theme.colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: Platform.OS === 'ios' ? 34 : 12,  // More padding for text
          paddingTop: 12,                                   // More top padding
          height: Platform.OS === 'ios' ? 90 : 72,         // Increased heights
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,  // Extra margin for Android
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={SafeHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: "Home tab",
          tabBarButton: (props) => {
            const haptics = useHaptics();
            return (
              <TouchableOpacity
                {...props}
                onPress={(e) => {
                  haptics.tabSwitch();
                  props.onPress?.(e);
                }}
                accessibilityRole="tab"
                accessibilityLabel="Home tab"
                accessibilityHint="Navigate to home screen"
                style={[props.style, { minHeight: 44, minWidth: 44 }]} // WCAG touch target
              />
            );
          },
        }}
      />
      <Tab.Screen 
        name="Feed" 
        component={ContractorSocialScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: "Community feed tab",
          tabBarButton: (props) => {
            const haptics = useHaptics();
            return (
              <TouchableOpacity
                {...props}
                onPress={(e) => {
                  haptics.tabSwitch();
                  props.onPress?.(e);
                }}
                accessibilityRole="tab"
                accessibilityLabel="Community feed tab"
                accessibilityHint="Navigate to community feed"
                style={[props.style, { minHeight: 44, minWidth: 44 }]} // WCAG touch target
              />
            );
          },
        }}
      />
      <Tab.Screen 
        name="Add" 
        component={HomeScreen} // Placeholder, actual action handled by button
        options={{
          tabBarIcon: ({ focused }) => <AddButton />,
          tabBarLabel: '',
          tabBarAccessibilityLabel: user?.role === 'homeowner' ? "Create service request" : "Browse jobs",
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              accessibilityRole="button"
              accessibilityLabel={user?.role === 'homeowner' ? "Create service request" : "Browse jobs"}
              accessibilityHint={user?.role === 'homeowner' ? "Create a new service request" : "Browse available jobs"}
              style={[props.style, { minHeight: 56, minWidth: 56 }]} // Larger touch target for FAB
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const haptics = useHaptics();
            haptics.buttonPress();
            if (user?.role === 'homeowner') {
              navigation.navigate('ServiceRequest');
            } else {
              navigation.navigate('Jobs');
            }
          },
        })}
      />
      <Tab.Screen 
        name="Inbox" 
        component={MessagesListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: "Messages tab",
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              accessibilityRole="tab"
              accessibilityLabel="Messages tab"
              accessibilityHint="Navigate to messages and conversations"
              style={[props.style, { minHeight: 44, minWidth: 44 }]} // WCAG touch target
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={SafeProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: "Profile tab",
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              accessibilityRole="tab"
              accessibilityLabel="Profile tab"
              accessibilityHint="Navigate to your profile and settings"
              style={[props.style, { minHeight: 44, minWidth: 44 }]} // WCAG touch target
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const MainNavigator = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Main" component={TabNavigator} />
    <RootStack.Screen 
      name="Jobs" 
      component={SafeJobsScreen}
    />
    <RootStack.Screen 
      name="JobPosting" 
      component={SafeJobPostingScreen}
      options={{ presentation: 'modal' }}
    />
    <RootStack.Screen 
      name="ServiceRequest" 
      component={ServiceRequestScreen}
    />
    <RootStack.Screen 
      name="JobDetails" 
      component={SafeJobDetailsScreen}
    />
    <RootStack.Screen 
      name="BidSubmission" 
      component={BidSubmissionScreen}
      options={{ presentation: 'modal' }}
    />
    <RootStack.Screen 
      name="FindContractors" 
      component={FindContractorsScreen}
    />
    <RootStack.Screen 
      name="ContractorDiscovery" 
      component={ContractorDiscoveryScreen}
    />
    <RootStack.Screen 
      name="Messaging" 
      component={MessagingScreen}
    />
    <RootStack.Screen 
      name="EditProfile" 
      component={EditProfileScreen}
    />
    <RootStack.Screen 
      name="NotificationSettings" 
      component={NotificationSettingsScreen}
    />
    <RootStack.Screen 
      name="PaymentMethods" 
      component={SafePaymentMethodsScreen}
    />
    <RootStack.Screen 
      name="HelpCenter" 
      component={HelpCenterScreen}
    />
    <RootStack.Screen 
      name="InvoiceManagement" 
      component={InvoiceManagementScreen}
    />
    <RootStack.Screen 
      name="CRMDashboard" 
      component={CRMDashboardScreen}
    />
    <RootStack.Screen 
      name="FinanceDashboard" 
      component={FinanceDashboardScreen}
    />
    <RootStack.Screen 
      name="ServiceAreas" 
      component={ServiceAreasScreen}
    />
    <RootStack.Screen 
      name="QuoteBuilder" 
      component={QuoteBuilderScreen}
    />
    <RootStack.Screen 
      name="CreateQuote" 
      component={CreateQuoteScreen}
      options={{ presentation: 'modal' }}
    />
  </RootStack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You could show a loading spinner here
  }

  return (
    <AppErrorBoundary>
      <NavigationContainer>
        {user ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </AppErrorBoundary>
  );
};

const styles = StyleSheet.create({
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary, // Green accent button
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20, // Lift above tab bar
  },
});

export default AppNavigator;
