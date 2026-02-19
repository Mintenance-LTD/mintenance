import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { JobsStackParamList } from '../types';

// Import existing screens
import JobsScreen from '../../screens/JobsScreen';
import { JobDetailsScreen } from '../../screens/job-details';
import JobPostingScreen from '../../screens/JobPostingScreen';
import BidSubmissionScreen from '../../screens/BidSubmissionScreen';
import PaymentScreen from '../../screens/PaymentScreen';
import { JobTimelineScreen } from '../../screens/job-details/JobTimelineScreen';
import { DisputeScreen } from '../../screens/DisputeScreen';
import { BidReviewScreen } from '../../screens/BidReviewScreen';
import { HomeownerPhotoReviewScreen } from '../../screens/job-details/HomeownerPhotoReviewScreen';
import { JobPhotoUploadScreen } from '../../screens/job-details/JobPhotoUploadScreen';
import { ContractViewScreen } from '../../screens/job-details/ContractViewScreen';

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

const SafePaymentScreen = withScreenErrorBoundary(
  PaymentScreen,
  'Payment',
  { fallbackRoute: 'JobDetails' }
);

const SafeJobTimelineScreen = withScreenErrorBoundary(
  JobTimelineScreen,
  'Job Timeline',
  { fallbackRoute: 'JobDetails' }
);

const SafeDisputeScreen = withScreenErrorBoundary(
  DisputeScreen,
  'Dispute',
  { fallbackRoute: 'JobDetails' }
);

const SafeBidReviewScreen = withScreenErrorBoundary(
  BidReviewScreen,
  'Bid Review',
  { fallbackRoute: 'JobDetails' }
);

const SafePhotoReviewScreen = withScreenErrorBoundary(
  HomeownerPhotoReviewScreen,
  'Photo Review',
  { fallbackRoute: 'JobDetails' }
);

const SafePhotoUploadScreen = withScreenErrorBoundary(
  JobPhotoUploadScreen,
  'Photo Upload',
  { fallbackRoute: 'JobDetails' }
);

const SafeContractViewScreen = withScreenErrorBoundary(
  ContractViewScreen,
  'Contract View',
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
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 300 } },
          close: { animation: 'timing', config: { duration: 250 } },
        },
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

      <JobsStack.Screen
        name="JobPayment"
        component={SafePaymentScreen}
        options={{
          title: 'Payment',
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
        name="JobTimeline"
        component={SafeJobTimelineScreen}
        options={{
          title: 'Job Timeline',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <JobsStack.Screen
        name="Dispute"
        component={SafeDisputeScreen}
        options={{
          title: 'Raise Dispute',
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
        name="BidReview"
        component={SafeBidReviewScreen}
        options={{
          title: 'Review Bids',
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
        name="PhotoReview"
        component={SafePhotoReviewScreen}
        options={{
          title: 'Review Work',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <JobsStack.Screen
        name="PhotoUpload"
        component={SafePhotoUploadScreen}
        options={{
          title: 'Upload Photos',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <JobsStack.Screen
        name="ContractView"
        component={SafeContractViewScreen}
        options={{
          title: 'Contract',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </JobsStack.Navigator>
  );
};

export default JobsNavigator;
