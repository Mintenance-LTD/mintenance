import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../types';

// Import existing screens
import InvoiceManagementScreen from '../../screens/InvoiceManagementScreen';
import { CreateInvoiceScreen } from '../../screens/create-invoice/CreateInvoiceScreen';
import { InvoiceDetailScreen } from '../../screens/invoice-detail/InvoiceDetailScreen';
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
import { ReviewSubmissionScreen } from '../../screens/job-details/ReviewSubmissionScreen';
import { JobSignOffScreen } from '../../screens/job-details/JobSignOffScreen';
import { ExploreMapScreen } from '../../screens/explore-map/ExploreMapScreen';

// Import error boundary wrapper
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

// ============================================================================
// SCREEN WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

const SafeInvoiceManagementScreen = withScreenErrorBoundary(
  InvoiceManagementScreen,
  'Invoices',
  { fallbackRoute: 'Main' }
);

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

const SafeReviewSubmissionScreen = withScreenErrorBoundary(
  ReviewSubmissionScreen,
  'Review Submission',
  { fallbackRoute: 'JobDetails' }
);

const SafeJobSignOffScreen = withScreenErrorBoundary(
  JobSignOffScreen,
  'Job Sign Off',
  { fallbackRoute: 'JobDetails' }
);

const SafeExploreMapScreen = withScreenErrorBoundary(
  ExploreMapScreen,
  'Job Map',
  { fallbackRoute: 'JobsList' }
);

const SafeCreateInvoiceScreen = withScreenErrorBoundary(
  CreateInvoiceScreen,
  'Create Invoice',
  { fallbackRoute: 'InvoiceManagement' }
);

const SafeInvoiceDetailScreen = withScreenErrorBoundary(
  InvoiceDetailScreen,
  'Invoice Detail',
  { fallbackRoute: 'InvoiceManagement' }
);

// ============================================================================
// JOBS NAVIGATOR
// ============================================================================

const JobsStack = createNativeStackNavigator<JobsStackParamList>();

export const JobsNavigator: React.FC = () => {
  return (
    <JobsStack.Navigator
      initialRouteName="JobsList"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <JobsStack.Screen
        name="InvoiceManagement"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SafeInvoiceManagementScreen as any}
        options={{
          title: 'Invoices',
          headerShown: false,
        }}
      />

      <JobsStack.Screen
        name="CreateInvoice"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SafeCreateInvoiceScreen as any}
        options={{ title: 'New Invoice', headerShown: false, presentation: 'modal', gestureEnabled: true }}
      />

      <JobsStack.Screen
        name="InvoiceDetail"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SafeInvoiceDetailScreen as any}
        options={{ title: 'Invoice Detail', headerShown: false, gestureEnabled: true }}
      />

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
        options={{ title: 'Post a Job', presentation: 'modal', gestureEnabled: true }}
      />
      <JobsStack.Screen
        name="BidSubmission"
        component={SafeBidSubmissionScreen}
        options={{ title: 'Submit Bid', presentation: 'modal', gestureEnabled: true }}
      />
      <JobsStack.Screen
        name="JobPayment"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SafePaymentScreen as any}
        options={{ title: 'Payment', presentation: 'modal', gestureEnabled: true }}
      />

      <JobsStack.Screen
        name="JobTimeline"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SafeJobTimelineScreen as any}
        options={{
          title: 'Job Timeline',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <JobsStack.Screen
        name="Dispute"
        component={SafeDisputeScreen}
        options={{ title: 'Raise Dispute', presentation: 'modal', gestureEnabled: true }}
      />
      <JobsStack.Screen
        name="BidReview"
        component={SafeBidReviewScreen}
        options={{ title: 'Review Bids', presentation: 'modal', gestureEnabled: true }}
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
      <JobsStack.Screen
        name="ReviewSubmission"
        component={SafeReviewSubmissionScreen}
        options={{ title: 'Leave Review', presentation: 'modal', gestureEnabled: true }}
      />
      <JobsStack.Screen
        name="JobSignOff"
        component={SafeJobSignOffScreen}
        options={{
          title: 'Review Work',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <JobsStack.Screen
        name="ExploreMap"
        component={SafeExploreMapScreen}
        options={{
          title: 'Browse Jobs Map',
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      />
    </JobsStack.Navigator>
  );
};

export default JobsNavigator;
