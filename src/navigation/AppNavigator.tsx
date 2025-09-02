import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useHaptics } from '../utils/haptics';

import { useAuth } from '../contexts/AuthContext';
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
import { theme } from '../theme';

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
      navigation.navigate('JobPosting');
    }
  };

  return (
    <TouchableOpacity 
      style={styles.addButton} 
      onPress={handleAddPress}
      accessibilityRole="button"
      accessibilityLabel={user?.role === 'homeowner' ? "Create service request" : "Post a job"}
      accessibilityHint={user?.role === 'homeowner' ? "Double tap to create a new service request" : "Double tap to post a new job"}
    >
      <Ionicons name="add" size={24} color="#fff" />
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
          backgroundColor: '#fff',
          borderTopColor: theme.colors.border,
          paddingBottom: Platform.OS === 'ios' ? 34 : 8,  // iOS safe area
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 83 : 56,        // Platform-specific heights
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
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
          tabBarAccessibilityLabel: user?.role === 'homeowner' ? "Create service request" : "Post a job",
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              accessibilityRole="button"
              accessibilityLabel={user?.role === 'homeowner' ? "Create service request" : "Post a job"}
              accessibilityHint={user?.role === 'homeowner' ? "Create a new service request" : "Post a new job"}
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
              navigation.navigate('JobPosting');
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
        component={ProfileScreen}
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
      name="JobPosting" 
      component={JobPostingScreen}
      options={{ presentation: 'modal' }}
    />
    <RootStack.Screen 
      name="ServiceRequest" 
      component={ServiceRequestScreen}
    />
    <RootStack.Screen 
      name="JobDetails" 
      component={JobDetailsScreen}
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
  </RootStack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You could show a loading spinner here
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
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