/**
 * CRITICAL USER WORKFLOWS E2E TESTS
 * Tests for mission-critical user journeys that must work flawlessly
 *
 * These tests cover the core value proposition of the Mintenance app:
 * 1. Complete homeowner-contractor matching workflow
 * 2. Payment processing with escrow
 * 3. Real-time communication
 * 4. Job completion and review cycle
 */

import { E2ETestHelper, CommonScenarios } from '../src/testing/e2e-setup';

describe('Critical User Workflows', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        camera: 'YES',
        photos: 'YES',
        location: 'always',
        notifications: 'YES',
        microphone: 'YES',
      },
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  beforeEach(async () => {
    await E2ETestHelper.reloadApp();
  });

  describe('🏠 Complete Homeowner Journey', () => {
    const homeownerEmail = 'homeowner.e2e@mintenance.test';
    const contractorEmail = 'contractor.e2e@mintenance.test';

    it('should complete full homeowner onboarding', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Launch and navigate to sign up
        await E2ETestHelper.expectElementToBeVisible('welcome-screen');
        await E2ETestHelper.tapElement('sign-up-button');

        // 2. Fill homeowner registration form
        await E2ETestHelper.fillAndSubmitForm({
          'email-input': homeownerEmail,
          'password-input': 'TestPassword123!',
          'first-name-input': 'John',
          'last-name-input': 'Homeowner',
          'phone-input': '(555) 123-4567',
        }, 'create-account-button');

        // 3. Select homeowner role
        await E2ETestHelper.waitAndTap('role-homeowner');
        await E2ETestHelper.waitAndTap('continue-button');

        // 4. Complete profile setup
        await E2ETestHelper.fillForm({
          'address-input': '123 Main Street, Anytown, CA 90210',
          'home-type-select': 'single-family',
          'notifications-preference': 'email-sms',
        });
        await E2ETestHelper.tapElement('complete-profile-button');

        // 5. Verify successful onboarding
        await E2ETestHelper.waitForElement('home-screen', 15000);
        await E2ETestHelper.expectTextToBeVisible('Welcome, John!');
        await E2ETestHelper.expectElementToBeVisible('post-job-button');
      }, 'Homeowner Onboarding');
    });

    it('should create emergency job with AI safety analysis', async () => {
      // Login as homeowner
      await E2ETestHelper.loginUser(homeownerEmail, 'TestPassword123!');

      await E2ETestHelper.measurePerformance(async () => {
        // 1. Create high-priority electrical job
        await E2ETestHelper.tapElement('post-job-button');
        await E2ETestHelper.expectElementToBeVisible('job-creation-screen');

        // 2. Fill job details
        await E2ETestHelper.fillForm({
          'job-title-input': 'URGENT: Electrical Outlet Sparking',
          'job-description-input': 'Kitchen outlet is sparking when I plug things in. Need immediate help - safety concern.',
          'job-budget-input': '300',
        });

        // 3. Select emergency category and priority
        await E2ETestHelper.tapElement('category-picker');
        await E2ETestHelper.tapElementByText('Electrical');
        await E2ETestHelper.tapElement('priority-emergency');

        // 4. Add location
        await E2ETestHelper.typeText('location-input', '123 Main Street, Anytown, CA 90210');

        // 5. Add photos for AI analysis
        await E2ETestHelper.tapElement('add-photo-button');
        await E2ETestHelper.tapElementByText('Camera');
        await E2ETestHelper.waitForElement('photo-preview', 5000);

        // 6. Wait for AI safety analysis
        await E2ETestHelper.waitForElement('ai-analysis-section', 20000);
        await E2ETestHelper.expectTextToBeVisible('SAFETY ALERT');
        await E2ETestHelper.expectTextToBeVisible('High Risk');
        await E2ETestHelper.expectTextToBeVisible('Turn off power');

        // 7. Submit job
        await E2ETestHelper.tapElement('post-job-submit');
        await E2ETestHelper.waitForElementByText('Job Posted Successfully!', 10000);

        // 8. Verify job appears in my jobs
        await E2ETestHelper.navigateToTab('jobs-tab');
        await E2ETestHelper.expectTextToBeVisible('URGENT: Electrical Outlet Sparking');
        await E2ETestHelper.expectTextToBeVisible('$300.00');
        await E2ETestHelper.expectTextToBeVisible('EMERGENCY');
      }, 'Emergency Job Creation with AI Analysis');
    });

    it('should receive and accept contractor bid', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Navigate to posted job
        await E2ETestHelper.navigateToTab('jobs-tab');
        await E2ETestHelper.tapElementByText('URGENT: Electrical Outlet Sparking');

        // 2. Wait for bids to appear (simulated)
        await E2ETestHelper.waitForElement('bids-section', 10000);
        await E2ETestHelper.expectTextToBeVisible('1 Bid Received');

        // 3. View bid details
        await E2ETestHelper.tapElement('view-bids-button');
        await E2ETestHelper.expectElementToBeVisible('bid-card');
        await E2ETestHelper.expectTextToBeVisible('Licensed Electrician');
        await E2ETestHelper.expectTextToBeVisible('$275.00');
        await E2ETestHelper.expectTextToBeVisible('Available now');

        // 4. Check contractor profile
        await E2ETestHelper.tapElement('contractor-profile-button');
        await E2ETestHelper.expectTextToBeVisible('5.0 ★ Rating');
        await E2ETestHelper.expectTextToBeVisible('50+ Jobs Completed');
        await E2ETestHelper.expectTextToBeVisible('Licensed & Insured');

        // 5. Accept bid
        await E2ETestHelper.goBack();
        await E2ETestHelper.tapElement('accept-bid-button');
        await E2ETestHelper.expectElementToBeVisible('bid-acceptance-modal');
        await E2ETestHelper.tapElement('confirm-accept-bid');

        // 6. Verify job assignment
        await E2ETestHelper.waitForElementByText('Job Assigned!', 5000);
        await E2ETestHelper.expectTextToBeVisible('Contractor Assigned');
        await E2ETestHelper.expectElementToBeVisible('contact-contractor-button');
        await E2ETestHelper.expectElementToBeVisible('proceed-to-payment-button');
      }, 'Bid Review and Acceptance');
    });

    it('should complete secure payment with escrow', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Proceed to payment
        await E2ETestHelper.tapElement('proceed-to-payment-button');
        await E2ETestHelper.expectElementToBeVisible('payment-screen');

        // 2. Verify escrow information
        await E2ETestHelper.expectTextToBeVisible('Escrow Protection');
        await E2ETestHelper.expectTextToBeVisible('$275.00');
        await E2ETestHelper.expectTextToBeVisible('Funds held securely');

        // 3. Add payment method
        await E2ETestHelper.tapElement('add-payment-method-button');
        await E2ETestHelper.fillForm({
          'card-number-input': '4111111111111111',
          'expiry-input': '12/28',
          'cvc-input': '123',
          'cardholder-name-input': 'John Homeowner',
        });

        // 4. Process payment
        await E2ETestHelper.tapElement('process-payment-button');
        await E2ETestHelper.expectElementToBeVisible('payment-processing-indicator');

        // 5. Wait for payment confirmation
        await E2ETestHelper.waitForElementByText('Payment Secured!', 15000);
        await E2ETestHelper.expectTextToBeVisible('Funds are held in escrow');
        await E2ETestHelper.expectTextToBeVisible('Released upon job completion');

        // 6. Verify job status update
        await E2ETestHelper.waitForElementByText('Work Can Begin', 5000);
        await E2ETestHelper.expectElementToBeVisible('track-progress-button');
      }, 'Secure Escrow Payment Processing');
    });
  });

  describe('🔧 Complete Contractor Journey', () => {
    it('should complete contractor onboarding with verification', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Logout current user and register contractor
        await E2ETestHelper.navigateToTab('profile-tab');
        await E2ETestHelper.tapElement('logout-button');

        await E2ETestHelper.tapElement('sign-up-button');
        await E2ETestHelper.fillAndSubmitForm({
          'email-input': contractorEmail,
          'password-input': 'TestPassword123!',
          'first-name-input': 'Jane',
          'last-name-input': 'Contractor',
          'phone-input': '(555) 987-6543',
        }, 'create-account-button');

        // 2. Select contractor role
        await E2ETestHelper.waitAndTap('role-contractor');
        await E2ETestHelper.waitAndTap('continue-button');

        // 3. Complete contractor profile
        await E2ETestHelper.fillForm({
          'business-name-input': 'Expert Electrical Services',
          'license-number-input': 'EL-12345-CA',
          'experience-years-input': '8',
          'service-radius-input': '25',
        });

        // 4. Select specializations
        await E2ETestHelper.tapElement('specialization-electrical');
        await E2ETestHelper.tapElement('specialization-emergency');
        await E2ETestHelper.tapElement('continue-button');

        // 5. Upload credentials
        await E2ETestHelper.tapElement('upload-license-button');
        await E2ETestHelper.tapElementByText('Photo Library');
        await E2ETestHelper.tapElement('upload-insurance-button');
        await E2ETestHelper.tapElementByText('Photo Library');

        // 6. Complete setup
        await E2ETestHelper.tapElement('complete-profile-button');
        await E2ETestHelper.waitForElement('verification-pending-screen', 10000);
        await E2ETestHelper.expectTextToBeVisible('Under Review');
      }, 'Contractor Onboarding with Verification');
    });

    it('should discover and bid on emergency job', async () => {
      // Skip verification for E2E testing
      await E2ETestHelper.loginUser(contractorEmail, 'TestPassword123!');

      await E2ETestHelper.measurePerformance(async () => {
        // 1. Navigate to job discovery
        await E2ETestHelper.navigateToTab('jobs-tab');
        await E2ETestHelper.expectElementToBeVisible('available-jobs-section');

        // 2. Filter for emergency electrical jobs
        await E2ETestHelper.tapElement('filter-button');
        await E2ETestHelper.tapElement('category-electrical');
        await E2ETestHelper.tapElement('priority-emergency');
        await E2ETestHelper.tapElement('apply-filters');

        // 3. Find the emergency job
        await E2ETestHelper.expectTextToBeVisible('URGENT: Electrical Outlet Sparking');
        await E2ETestHelper.tapElementByText('URGENT: Electrical Outlet Sparking');

        // 4. Review job details and AI analysis
        await E2ETestHelper.expectElementToBeVisible('job-details-screen');
        await E2ETestHelper.expectTextToBeVisible('SAFETY ALERT');
        await E2ETestHelper.expectTextToBeVisible('High Risk');
        await E2ETestHelper.expectTextToBeVisible('$300.00 Budget');

        // 5. Submit competitive bid
        await E2ETestHelper.tapElement('submit-bid-button');
        await E2ETestHelper.fillForm({
          'bid-amount-input': '275',
          'estimated-duration-input': '2',
          'bid-description-input': 'Licensed electrician with 8+ years experience. Can respond immediately to this safety issue. Will bring all necessary tools and parts.',
        });

        // 6. Add availability
        await E2ETestHelper.tapElement('available-now-toggle');
        await E2ETestHelper.tapElement('emergency-service-toggle');

        // 7. Submit bid
        await E2ETestHelper.tapElement('submit-bid-confirm');
        await E2ETestHelper.waitForElementByText('Bid Submitted!', 5000);
        await E2ETestHelper.expectTextToBeVisible('Homeowner will be notified');
      }, 'Emergency Job Discovery and Bidding');
    });

    it('should accept job assignment and start work', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Navigate to my jobs to see assignment
        await E2ETestHelper.navigateToTab('jobs-tab');
        await E2ETestHelper.tapElement('my-jobs-filter');
        await E2ETestHelper.expectTextToBeVisible('Job Assigned');

        // 2. Accept job assignment
        await E2ETestHelper.tapElementByText('URGENT: Electrical Outlet Sparking');
        await E2ETestHelper.expectElementToBeVisible('assignment-notification');
        await E2ETestHelper.tapElement('accept-assignment-button');

        // 3. Confirm arrival and start work
        await E2ETestHelper.waitForElement('job-status-screen', 5000);
        await E2ETestHelper.tapElement('confirm-arrival-button');
        await E2ETestHelper.tapElement('start-work-button');

        // 4. Update work progress
        await E2ETestHelper.tapElement('update-progress-button');
        await E2ETestHelper.typeText('progress-update-input', 'Arrived on site. Identified faulty outlet. Turning off power to work safely.');
        await E2ETestHelper.tapElement('send-update-button');

        // 5. Take progress photos
        await E2ETestHelper.tapElement('add-progress-photo-button');
        await E2ETestHelper.tapElementByText('Camera');
        await E2ETestHelper.waitForElement('photo-uploaded', 5000);
      }, 'Job Assignment Acceptance and Work Start');
    });
  });

  describe('💬 Real-time Communication', () => {
    it('should enable seamless contractor-homeowner messaging', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Open job conversation
        await E2ETestHelper.tapElement('contact-homeowner-button');
        await E2ETestHelper.expectElementToBeVisible('conversation-screen');

        // 2. Send initial message
        await E2ETestHelper.sendMessage('Hi John! I\'m on my way to address your electrical issue. I should arrive within 15 minutes.');

        // 3. Verify message appears
        await E2ETestHelper.expectTextToBeVisible('I\'m on my way');
        await E2ETestHelper.expectElementToBeVisible('message-sent-indicator');

        // 4. Send photos
        await E2ETestHelper.tapElement('attach-photo-button');
        await E2ETestHelper.tapElementByText('Camera');
        await E2ETestHelper.waitForElement('photo-message', 5000);

        // 5. Share location
        await E2ETestHelper.tapElement('share-location-button');
        await E2ETestHelper.expectElementToBeVisible('location-shared-indicator');

        // 6. Test typing indicators (simulated)
        await E2ETestHelper.typeText('message-input', 'I have all the parts needed');
        await E2ETestHelper.expectElementToBeVisible('typing-indicator');
      }, 'Real-time Messaging Communication');
    });

    it('should support video calling for complex issues', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Initiate video call from conversation
        await E2ETestHelper.tapElement('video-call-button');
        await E2ETestHelper.expectElementToBeVisible('video-call-request-modal');

        // 2. Send call request
        await E2ETestHelper.tapElement('send-call-request-button');
        await E2ETestHelper.expectTextToBeVisible('Calling John...');

        // 3. Simulate call acceptance
        await E2ETestHelper.waitForElement('video-call-screen', 10000);
        await E2ETestHelper.expectElementToBeVisible('local-video-view');
        await E2ETestHelper.expectElementToBeVisible('remote-video-view');

        // 4. Test call controls
        await E2ETestHelper.tapElement('mute-button');
        await E2ETestHelper.expectElementToBeVisible('muted-indicator');
        await E2ETestHelper.tapElement('camera-toggle-button');

        // 5. Share screen to show work
        await E2ETestHelper.tapElement('screen-share-button');
        await E2ETestHelper.expectElementToBeVisible('screen-sharing-indicator');

        // 6. End call
        await E2ETestHelper.tapElement('end-call-button');
        await E2ETestHelper.expectElementToBeVisible('conversation-screen');
      }, 'Video Call Communication');
    });
  });

  describe('✅ Job Completion and Review Cycle', () => {
    it('should complete work and trigger payment release', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Mark work as completed
        await E2ETestHelper.navigateToTab('jobs-tab');
        await E2ETestHelper.tapElementByText('URGENT: Electrical Outlet Sparking');
        await E2ETestHelper.tapElement('mark-complete-button');

        // 2. Add completion details
        await E2ETestHelper.fillForm({
          'completion-notes-input': 'Replaced faulty outlet and verified all connections. Tested thoroughly - no more sparking. Home is now safe.',
          'time-spent-input': '2.5',
        });

        // 3. Upload completion photos
        await E2ETestHelper.tapElement('add-completion-photo-button');
        await E2ETestHelper.tapElementByText('Camera');
        await E2ETestHelper.waitForElement('completion-photo-uploaded', 5000);

        // 4. Submit completion
        await E2ETestHelper.tapElement('submit-completion-button');
        await E2ETestHelper.waitForElementByText('Work Marked Complete!', 5000);
        await E2ETestHelper.expectTextToBeVisible('Awaiting homeowner confirmation');

        // 5. Switch to homeowner account
        await E2ETestHelper.logoutUser();
        await E2ETestHelper.loginUser(homeownerEmail, 'TestPassword123!');

        // 6. Review and confirm completion
        await E2ETestHelper.expectElementToBeVisible('completion-notification');
        await E2ETestHelper.tapElement('review-completed-work-button');
        await E2ETestHelper.expectTextToBeVisible('Work Summary');
        await E2ETestHelper.expectElementToBeVisible('completion-photos');

        // 7. Confirm and release payment
        await E2ETestHelper.tapElement('confirm-completion-button');
        await E2ETestHelper.tapElement('release-payment-button');
        await E2ETestHelper.waitForElementByText('Payment Released!', 10000);
      }, 'Job Completion and Payment Release');
    });

    it('should enable mutual reviews and ratings', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Rate contractor (homeowner perspective)
        await E2ETestHelper.expectElementToBeVisible('rate-contractor-modal');
        await E2ETestHelper.tapElement('rating-5-stars');
        await E2ETestHelper.typeText('review-text-input', 'Excellent work! Jane was professional, punctual, and fixed the dangerous electrical issue quickly. Highly recommend!');
        await E2ETestHelper.tapElement('submit-review-button');

        // 2. Switch to contractor to rate homeowner
        await E2ETestHelper.logoutUser();
        await E2ETestHelper.loginUser(contractorEmail, 'TestPassword123!');

        // 3. Rate homeowner
        await E2ETestHelper.expectElementToBeVisible('rate-homeowner-modal');
        await E2ETestHelper.tapElement('rating-5-stars');
        await E2ETestHelper.typeText('review-text-input', 'Great client! Clear communication about the issue, prompt payment, and very understanding. Would work with again.');
        await E2ETestHelper.tapElement('submit-review-button');

        // 4. Verify reviews appear in profiles
        await E2ETestHelper.navigateToTab('profile-tab');
        await E2ETestHelper.expectTextToBeVisible('5.0 ★ Rating');
        await E2ETestHelper.expectTextToBeVisible('1 Job Completed');
        await E2ETestHelper.expectTextToBeVisible('Great client!');
      }, 'Mutual Review and Rating System');
    });
  });

  describe('🚨 Error Handling and Edge Cases', () => {
    it('should handle payment failures gracefully', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Simulate payment failure scenario
        await device.setURLBlacklist(['**/stripe/**']);

        // 2. Attempt payment
        await E2ETestHelper.loginUser(homeownerEmail, 'TestPassword123!');
        await E2ETestHelper.navigateToTab('profile-tab');
        await E2ETestHelper.tapElement('payment-methods-button');
        await E2ETestHelper.tapElement('add-payment-method-button');

        // 3. Fill payment form
        await E2ETestHelper.fillForm({
          'card-number-input': '4000000000000002', // Declined card
          'expiry-input': '12/28',
          'cvc-input': '123',
        });

        await E2ETestHelper.tapElement('save-payment-method-button');

        // 4. Handle payment failure
        await E2ETestHelper.waitForElementByText('Payment Failed', 5000);
        await E2ETestHelper.expectElementToBeVisible('retry-payment-button');
        await E2ETestHelper.expectTextToBeVisible('Please try a different payment method');

        // 5. Recover by removing URL blacklist
        await device.setURLBlacklist([]);
        await E2ETestHelper.tapElement('retry-payment-button');
      }, 'Payment Failure Recovery');
    });

    it('should handle network connectivity issues', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Simulate network failure
        await device.setURLBlacklist(['**']);

        // 2. Try to load jobs
        await E2ETestHelper.navigateToTab('jobs-tab');
        await E2ETestHelper.waitForElementByText('Connection Error', 10000);
        await E2ETestHelper.expectElementToBeVisible('offline-indicator');
        await E2ETestHelper.expectElementToBeVisible('retry-button');

        // 3. Show cached content
        await E2ETestHelper.expectTextToBeVisible('Showing cached content');
        await E2ETestHelper.expectElementToBeVisible('cached-jobs-list');

        // 4. Restore connection
        await device.setURLBlacklist([]);
        await E2ETestHelper.tapElement('retry-button');
        await E2ETestHelper.waitForElement('jobs-list', 10000);
        await E2ETestHelper.expectElementToNotBeVisible('offline-indicator');
      }, 'Network Failure Recovery');
    });

    it('should handle app backgrounding during critical operations', async () => {
      await E2ETestHelper.measurePerformance(async () => {
        // 1. Start payment process
        await E2ETestHelper.loginUser(homeownerEmail, 'TestPassword123!');
        await E2ETestHelper.navigateToTab('jobs-tab');
        await E2ETestHelper.tapElementByText('Test Job');
        await E2ETestHelper.tapElement('proceed-to-payment-button');

        // 2. Background app during payment
        await E2ETestHelper.backgroundApp(5000);

        // 3. Verify app state recovery
        await E2ETestHelper.expectElementToBeVisible('payment-screen');
        await E2ETestHelper.expectTextToBeVisible('Session restored');
        await E2ETestHelper.expectElementToBeVisible('payment-form');

        // 4. Complete payment after recovery
        await E2ETestHelper.tapElement('process-payment-button');
        await E2ETestHelper.waitForElementByText('Payment Secured!', 15000);
      }, 'App Background State Recovery');
    });
  });

  describe('📊 Performance Validation', () => {
    it('should meet performance benchmarks for critical flows', async () => {
      const performanceResults = {};

      // 1. App launch performance
      performanceResults.appLaunch = await E2ETestHelper.testAppLaunchTime();
      expect(performanceResults.appLaunch).toBeLessThan(5000);

      // 2. Job creation performance
      await E2ETestHelper.loginUser(homeownerEmail, 'TestPassword123!');
      performanceResults.jobCreation = await E2ETestHelper.measurePerformance(async () => {
        await E2ETestHelper.tapElement('post-job-button');
        await E2ETestHelper.waitForElement('job-creation-screen');
      }, 'Job Creation Screen Load');
      expect(performanceResults.jobCreation).toBeLessThan(2000);

      // 3. Payment processing performance
      performanceResults.paymentProcessing = await E2ETestHelper.measurePerformance(async () => {
        await E2ETestHelper.navigateToTab('profile-tab');
        await E2ETestHelper.tapElement('payment-methods-button');
        await E2ETestHelper.waitForElement('payment-methods-screen');
      }, 'Payment Methods Load');
      expect(performanceResults.paymentProcessing).toBeLessThan(3000);

      // 4. Messaging performance
      performanceResults.messagingLoad = await E2ETestHelper.measurePerformance(async () => {
        await E2ETestHelper.navigateToTab('messages-tab');
        await E2ETestHelper.waitForElement('conversations-list');
      }, 'Messages Load');
      expect(performanceResults.messagingLoad).toBeLessThan(2000);

      console.log('📊 Performance Results:', performanceResults);
    });
  });

  describe('♿ Accessibility Validation', () => {
    it('should meet accessibility standards', async () => {
      await CommonScenarios.testAccessibilityCompliance();

      // Test critical flows with accessibility enabled
      await E2ETestHelper.enableAccessibility();

      // 1. Test job creation accessibility
      await E2ETestHelper.loginUser(homeownerEmail, 'TestPassword123!');
      await E2ETestHelper.tapElement('post-job-button');

      // Verify all inputs have proper labels
      await E2ETestHelper.expectElementToHaveLabel('job-title-input', 'Job title');
      await E2ETestHelper.expectElementToHaveLabel('job-description-input', 'Job description');
      await E2ETestHelper.expectElementToHaveLabel('job-budget-input', 'Budget amount');

      // 2. Test navigation accessibility
      await E2ETestHelper.expectElementToHaveLabel('jobs-tab', 'Jobs tab');
      await E2ETestHelper.expectElementToHaveLabel('messages-tab', 'Messages tab');
      await E2ETestHelper.expectElementToHaveLabel('profile-tab', 'Profile tab');

      // 3. Test form validation announcements
      await E2ETestHelper.tapElement('post-job-submit');
      await E2ETestHelper.expectTextToBeVisible('Please fill in all required fields');
    });
  });
});

/**
 * Performance monitoring helper
 */
async function validateCriticalPath(pathName, operation, maxTime) {
  const result = await E2ETestHelper.measurePerformance(operation, pathName);
  if (result > maxTime) {
    throw new Error(`${pathName} exceeded performance budget: ${result}ms > ${maxTime}ms`);
  }
  return result;
}