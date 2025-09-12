import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { JobsStackParamList } from '../types';

// Import existing screens
import JobsScreen from '../../screens/JobsScreen';
import JobDetailsScreen from '../../screens/JobDetailsScreen';
import JobPostingScreen from '../../screens/JobPostingScreen';
import BidSubmissionScreen from '../../screens/BidSubmissionScreen';

// Import error boundary wrapper
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

// ============================================================================
// SCREEN WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

const SafeJobsScreen = withScreenErrorBoundary(
  JobsScreen,
  'Jobs List',
  { fallbackRoute: 'Main' }
);

const SafeJobDetailsScreen = withScreenErrorBoundary(
  JobDetailsScreen,
  'Job Details',
  { fallbackRoute: 'JobsList' }
);

const SafeJobPostingScreen = withScreenErrorBoundary(
  JobPostingScreen,
  'Job Posting',
  { fallbackRoute: 'JobsList' }
);

const SafeBidSubmissionScreen = withScreenErrorBoundary(
  BidSubmissionScreen,
  'Bid Submission',
  { fallbackRoute: 'JobDetails' }
);

// ============================================================================
// JOBS NAVIGATOR
// ============================================================================

const JobsStack = createStackNavigator<JobsStackParamList>();

export const JobsNavigator: React.FC = () => {
  return (
    <JobsStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
    >
      <JobsStack.Screen
        name="JobsList"
        component={SafeJobsScreen}
        options={{
          title: 'Jobs',
          headerShown: false,
        }}
      />
      
      <JobsStack.Screen
        name="JobDetails"
        component={SafeJobDetailsScreen}
        options={{
          title: 'Job Details',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <JobsStack.Screen
        name="JobPosting"
        component={SafeJobPostingScreen}
        options={{
          title: 'Post a Job',
          presentation: 'modal',
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateY: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.height, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      
      <JobsStack.Screen
        name="BidSubmission"
        component={SafeBidSubmissionScreen}
        options={{
          title: 'Submit Bid',
          presentation: 'modal',
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateY: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.height, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
    </JobsStack.Navigator>
  );
};

export default JobsNavigator;
