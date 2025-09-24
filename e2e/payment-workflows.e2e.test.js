/**
 * End-to-End Payment Workflow Tests
 * Critical payment scenarios tested in real browser/device environment
 */

const { device, element, by, expect: detoxExpect } = require('detox');

describe('Payment Workflows E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Successful Payment Flows', () => {
    it('should complete homeowner payment for job', async () => {
      // Login as homeowner
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      // Wait for home screen
      await detoxExpect(element(by.id('home-screen'))).toBeVisible();

      // Navigate to active job
      await element(by.id('jobs-tab')).tap();
      await element(by.id('job-card-0')).tap();

      // Verify job details screen
      await detoxExpect(element(by.id('job-details-screen'))).toBeVisible();
      await detoxExpect(element(by.id('job-title'))).toBeVisible();
      await detoxExpect(element(by.id('job-amount'))).toBeVisible();

      // Start payment process
      await element(by.id('pay-contractor-button')).tap();

      // Verify payment screen
      await detoxExpect(element(by.id('payment-screen'))).toBeVisible();
      await detoxExpect(element(by.id('payment-amount-display'))).toBeVisible();

      // Enter payment method details
      await element(by.id('card-number-input')).typeText('4242424242424242');
      await element(by.id('card-expiry-input')).typeText('1225');
      await element(by.id('card-cvc-input')).typeText('123');
      await element(by.id('card-name-input')).typeText('Test User');

      // Submit payment
      await element(by.id('submit-payment-button')).tap();

      // Wait for processing
      await detoxExpect(element(by.id('payment-processing'))).toBeVisible();

      // Wait for success
      await detoxExpect(element(by.id('payment-success-screen'))).toBeVisible(10000);
      await detoxExpect(element(by.text('Payment Successful'))).toBeVisible();

      // Verify payment confirmation details
      await detoxExpect(element(by.id('payment-confirmation-id'))).toBeVisible();
      await detoxExpect(element(by.id('payment-amount-confirmed'))).toBeVisible();

      // Return to job details
      await element(by.id('done-button')).tap();

      // Verify job status updated
      await detoxExpect(element(by.text('Payment Completed'))).toBeVisible();
    });

    it('should handle 3D Secure authentication flow', async () => {
      // Login and navigate to payment
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      await element(by.id('jobs-tab')).tap();
      await element(by.id('job-card-1')).tap();
      await element(by.id('pay-contractor-button')).tap();

      // Use 3D Secure test card
      await element(by.id('card-number-input')).typeText('4000000000003155');
      await element(by.id('card-expiry-input')).typeText('1225');
      await element(by.id('card-cvc-input')).typeText('123');
      await element(by.id('card-name-input')).typeText('Test 3DS User');

      // Submit payment
      await element(by.id('submit-payment-button')).tap();

      // Wait for 3D Secure challenge
      await detoxExpect(element(by.id('3ds-authentication-modal'))).toBeVisible(5000);
      await detoxExpect(element(by.text('Additional Authentication Required'))).toBeVisible();

      // Complete 3D Secure (simulate user authentication)
      await element(by.id('3ds-authenticate-button')).tap();

      // Wait for final payment confirmation
      await detoxExpect(element(by.id('payment-success-screen'))).toBeVisible(10000);
      await detoxExpect(element(by.text('Payment Successful'))).toBeVisible();
    });
  });

  describe('Payment Error Scenarios', () => {
    it('should handle declined card gracefully', async () => {
      // Login and navigate to payment
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      await element(by.id('jobs-tab')).tap();
      await element(by.id('job-card-0')).tap();
      await element(by.id('pay-contractor-button')).tap();

      // Use declined card test number
      await element(by.id('card-number-input')).typeText('4000000000000002');
      await element(by.id('card-expiry-input')).typeText('1225');
      await element(by.id('card-cvc-input')).typeText('123');
      await element(by.id('card-name-input')).typeText('Declined Card');

      // Submit payment
      await element(by.id('submit-payment-button')).tap();

      // Wait for error message
      await detoxExpect(element(by.id('payment-error-message'))).toBeVisible(5000);
      await detoxExpect(element(by.text('Your card was declined.'))).toBeVisible();

      // Verify user can retry
      await detoxExpect(element(by.id('retry-payment-button'))).toBeVisible();
      await detoxExpect(element(by.id('cancel-payment-button'))).toBeVisible();

      // Test retry functionality
      await element(by.id('retry-payment-button')).tap();
      await detoxExpect(element(by.id('payment-screen'))).toBeVisible();
    });

    it('should handle insufficient funds error', async () => {
      // Similar flow but with insufficient funds card
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      await element(by.id('jobs-tab')).tap();
      await element(by.id('job-card-0')).tap();
      await element(by.id('pay-contractor-button')).tap();

      // Use insufficient funds test card
      await element(by.id('card-number-input')).typeText('4000000000009995');
      await element(by.id('card-expiry-input')).typeText('1225');
      await element(by.id('card-cvc-input')).typeText('123');
      await element(by.id('card-name-input')).typeText('Insufficient Funds');

      await element(by.id('submit-payment-button')).tap();

      // Verify specific error message
      await detoxExpect(element(by.text('Your card has insufficient funds.'))).toBeVisible(5000);
    });

    it('should handle network connectivity issues', async () => {
      // Simulate network disconnection
      await device.setNetworkConnection('offline');

      // Attempt payment while offline
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      // Should show offline message or cached content
      await detoxExpect(element(by.id('offline-indicator'))).toBeVisible();

      // Navigate to payment (should be blocked or queued)
      await element(by.id('jobs-tab')).tap();
      await element(by.id('job-card-0')).tap();
      await element(by.id('pay-contractor-button')).tap();

      // Should show network error or offline message
      await detoxExpect(
        element(by.text('Network connection required for payments'))
      ).toBeVisible();

      // Restore network connection
      await device.setNetworkConnection('online');

      // Wait for connectivity restoration
      await detoxExpect(element(by.id('online-indicator'))).toBeVisible(5000);

      // Retry payment
      await element(by.id('retry-payment-button')).tap();

      // Should now proceed normally
      await detoxExpect(element(by.id('payment-screen'))).toBeVisible();
    });
  });

  describe('Escrow Management E2E', () => {
    it('should complete escrow hold and release workflow', async () => {
      // Login as homeowner
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      // Make payment (escrow hold)
      await element(by.id('jobs-tab')).tap();
      await element(by.id('job-card-0')).tap();
      await element(by.id('pay-contractor-button')).tap();

      // Complete payment
      await element(by.id('card-number-input')).typeText('4242424242424242');
      await element(by.id('card-expiry-input')).typeText('1225');
      await element(by.id('card-cvc-input')).typeText('123');
      await element(by.id('card-name-input')).typeText('Escrow Test');
      await element(by.id('submit-payment-button')).tap();

      // Wait for success
      await detoxExpect(element(by.id('payment-success-screen'))).toBeVisible(10000);
      await element(by.id('done-button')).tap();

      // Verify payment is held in escrow
      await detoxExpect(element(by.text('Payment Held in Escrow'))).toBeVisible();

      // Mark job as completed (contractor would do this)
      await element(by.id('mark-job-complete-button')).tap();
      await detoxExpect(element(by.text('Job marked as complete'))).toBeVisible();

      // Release escrow payment
      await element(by.id('release-payment-button')).tap();
      await detoxExpect(element(by.id('release-confirmation-modal'))).toBeVisible();
      await element(by.id('confirm-release-button')).tap();

      // Wait for release confirmation
      await detoxExpect(element(by.text('Payment Released to Contractor'))).toBeVisible(5000);

      // Verify job status updated
      await detoxExpect(element(by.text('Job Completed - Payment Released'))).toBeVisible();
    });

    it('should handle escrow refund scenario', async () => {
      // Similar setup but test refund path
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      // Navigate to job with escrow payment
      await element(by.id('jobs-tab')).tap();
      await element(by.id('job-card-with-escrow')).tap();

      // Verify escrow status
      await detoxExpect(element(by.text('Payment Held in Escrow'))).toBeVisible();

      // Initiate refund request
      await element(by.id('request-refund-button')).tap();
      await detoxExpect(element(by.id('refund-reason-modal'))).toBeVisible();

      // Select refund reason
      await element(by.id('refund-reason-picker')).tap();
      await element(by.text('Work not completed satisfactorily')).tap();
      await element(by.id('confirm-refund-request-button')).tap();

      // Wait for refund processing
      await detoxExpect(element(by.text('Refund request submitted'))).toBeVisible();

      // Admin would approve refund in real scenario
      // For E2E test, simulate approval
      await element(by.id('simulate-refund-approval')).tap();

      // Verify refund completion
      await detoxExpect(element(by.text('Refund processed successfully'))).toBeVisible(10000);
      await detoxExpect(element(by.text('Job Status: Refunded'))).toBeVisible();
    });
  });

  describe('Contractor Payout E2E', () => {
    it('should complete contractor payout setup', async () => {
      // Login as contractor
      await element(by.id('login-email')).typeText('contractor@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      // Navigate to earnings/payout section
      await element(by.id('profile-tab')).tap();
      await element(by.id('earnings-section')).tap();

      // Check if payout account is set up
      await detoxExpect(element(by.id('payout-status-section'))).toBeVisible();

      // If not set up, initiate setup
      if (await element(by.id('setup-payout-button')).isVisible()) {
        await element(by.id('setup-payout-button')).tap();

        // Should navigate to Stripe Connect onboarding
        await detoxExpect(element(by.id('stripe-connect-webview'))).toBeVisible(5000);

        // Simulate completing onboarding (in real test, would fill forms)
        await element(by.id('simulate-onboarding-complete')).tap();

        // Return to app
        await detoxExpect(element(by.text('Payout account setup complete'))).toBeVisible();
      }

      // Verify payout account status
      await detoxExpect(element(by.text('Payout Account: Active'))).toBeVisible();
      await detoxExpect(element(by.id('earnings-balance'))).toBeVisible();
      await detoxExpect(element(by.id('pending-payouts'))).toBeVisible();
    });
  });

  describe('Payment History and Reporting', () => {
    it('should display accurate payment history', async () => {
      // Login as homeowner
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      // Navigate to payment history
      await element(by.id('profile-tab')).tap();
      await element(by.id('payment-history-section')).tap();

      // Verify payment history screen
      await detoxExpect(element(by.id('payment-history-screen'))).toBeVisible();
      await detoxExpect(element(by.id('payment-history-list'))).toBeVisible();

      // Check for payment entries
      await detoxExpect(element(by.id('payment-item-0'))).toBeVisible();

      // Tap on payment to see details
      await element(by.id('payment-item-0')).tap();
      await detoxExpect(element(by.id('payment-details-modal'))).toBeVisible();

      // Verify payment details
      await detoxExpect(element(by.id('payment-amount-detail'))).toBeVisible();
      await detoxExpect(element(by.id('payment-date-detail'))).toBeVisible();
      await detoxExpect(element(by.id('payment-status-detail'))).toBeVisible();
      await detoxExpect(element(by.id('payment-method-detail'))).toBeVisible();

      // Close details
      await element(by.id('close-payment-details')).tap();

      // Test filtering
      await element(by.id('filter-payments-button')).tap();
      await element(by.text('Completed')).tap();

      // Verify filtered results
      await detoxExpect(element(by.id('payment-history-list'))).toBeVisible();
    });
  });

  describe('Security and Validation E2E', () => {
    it('should prevent payment with invalid card details', async () => {
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      await element(by.id('jobs-tab')).tap();
      await element(by.id('job-card-0')).tap();
      await element(by.id('pay-contractor-button')).tap();

      // Test invalid card number
      await element(by.id('card-number-input')).typeText('1234567890123456');
      await element(by.id('card-expiry-input')).typeText('1225');
      await element(by.id('card-cvc-input')).typeText('123');

      // Submit button should be disabled or show validation error
      await detoxExpect(element(by.id('card-number-error'))).toBeVisible();
      await detoxExpect(element(by.text('Invalid card number'))).toBeVisible();

      // Test expired card
      await element(by.id('card-number-input')).clearText();
      await element(by.id('card-number-input')).typeText('4242424242424242');
      await element(by.id('card-expiry-input')).clearText();
      await element(by.id('card-expiry-input')).typeText('0120'); // Expired

      await detoxExpect(element(by.id('card-expiry-error'))).toBeVisible();
      await detoxExpect(element(by.text('Card has expired'))).toBeVisible();
    });

    it('should enforce payment amount limits', async () => {
      // Test with job amount exceeding limit
      await element(by.id('login-email')).typeText('homeowner@test.com');
      await element(by.id('login-password')).typeText('testpassword');
      await element(by.id('login-button')).tap();

      // Navigate to high-value job
      await element(by.id('jobs-tab')).tap();
      await element(by.id('high-value-job-card')).tap();

      // Should show amount validation error
      await detoxExpect(element(by.text('Amount exceeds payment limit'))).toBeVisible();
      await detoxExpect(element(by.id('contact-support-button'))).toBeVisible();
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });
});