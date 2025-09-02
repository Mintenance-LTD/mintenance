/**
 * Maintenance App E2E Tests
 * Complete user journey testing for homeowners and contractors
 */

describe('Maintenance App E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { 
        camera: 'YES', 
        photos: 'YES',
        location: 'always',
        notifications: 'YES' 
      }
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('App Launch and Navigation', () => {
    it('should launch and show welcome screen', async () => {
      await expect(element(by.id('welcome-screen'))).toBeVisible();
      await expect(element(by.text('Welcome to Mintenance'))).toBeVisible();
    });

    it('should navigate to sign up screen', async () => {
      await element(by.id('sign-up-button')).tap();
      await expect(element(by.id('sign-up-screen'))).toBeVisible();
      await expect(element(by.id('email-input'))).toBeVisible();
    });

    it('should navigate back to welcome from sign up', async () => {
      await element(by.id('sign-up-button')).tap();
      await element(by.id('back-button')).tap();
      await expect(element(by.id('welcome-screen'))).toBeVisible();
    });
  });

  describe('User Authentication Flow', () => {
    it('should allow homeowner sign up', async () => {
      await element(by.id('sign-up-button')).tap();
      
      // Fill out sign up form
      await element(by.id('email-input')).typeText('homeowner.test@example.com');
      await element(by.id('password-input')).typeText('TestPassword123!');
      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Homeowner');
      await element(by.id('role-homeowner')).tap();
      
      await element(by.id('create-account-button')).tap();
      
      // Should navigate to home screen after successful sign up
      await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
    });

    it('should allow contractor sign up', async () => {
      // First sign out if needed
      await element(by.id('profile-tab')).tap();
      await element(by.id('sign-out-button')).tap();
      
      await element(by.id('sign-up-button')).tap();
      
      // Fill out contractor sign up form
      await element(by.id('email-input')).typeText('contractor.test@example.com');
      await element(by.id('password-input')).typeText('TestPassword123!');
      await element(by.id('first-name-input')).typeText('Jane');
      await element(by.id('last-name-input')).typeText('Contractor');
      await element(by.id('role-contractor')).tap();
      
      await element(by.id('create-account-button')).tap();
      
      await waitFor(element(by.id('contractor-onboarding-screen'))).toBeVisible().withTimeout(10000);
    });

    it('should allow user sign in', async () => {
      await element(by.id('sign-in-button')).tap();
      
      await element(by.id('email-input')).typeText('homeowner.test@example.com');
      await element(by.id('password-input')).typeText('TestPassword123!');
      
      await element(by.id('sign-in-submit-button')).tap();
      
      await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
    });
  });

  describe('Job Posting Flow (Homeowner)', () => {
    beforeEach(async () => {
      // Ensure we're signed in as homeowner
      await element(by.id('sign-in-button')).tap();
      await element(by.id('email-input')).typeText('homeowner.test@example.com');
      await element(by.id('password-input')).typeText('TestPassword123!');
      await element(by.id('sign-in-submit-button')).tap();
      await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
    });

    it('should create a new job posting', async () => {
      // Navigate to post job
      await element(by.id('post-job-button')).tap();
      await expect(element(by.id('post-job-screen'))).toBeVisible();
      
      // Fill out job details
      await element(by.id('job-title-input')).typeText('Kitchen Faucet Repair');
      await element(by.id('job-description-input')).typeText('Leaky kitchen faucet needs professional repair. Water dripping constantly.');
      await element(by.id('job-location-input')).typeText('123 Main Street, Anytown, USA');
      await element(by.id('job-budget-input')).typeText('150');
      
      // Select category
      await element(by.id('category-picker')).tap();
      await element(by.text('Plumbing')).tap();
      
      // Set priority
      await element(by.id('priority-high')).tap();
      
      // Add photo (mock)
      await element(by.id('add-photo-button')).tap();
      await element(by.text('Camera')).tap();
      
      // Submit job
      await element(by.id('post-job-submit')).tap();
      
      // Should show success and navigate to job details
      await waitFor(element(by.text('Job Posted Successfully!'))).toBeVisible().withTimeout(5000);
      await expect(element(by.id('job-details-screen'))).toBeVisible();
    });

    it('should show job in my jobs list', async () => {
      // Navigate to My Jobs
      await element(by.id('jobs-tab')).tap();
      await element(by.id('my-jobs-filter')).tap();
      
      // Should see the posted job
      await expect(element(by.text('Kitchen Faucet Repair'))).toBeVisible();
      await expect(element(by.text('$150.00'))).toBeVisible();
    });

    it('should allow editing job details', async () => {
      await element(by.id('jobs-tab')).tap();
      await element(by.id('my-jobs-filter')).tap();
      
      // Tap on job to open details
      await element(by.text('Kitchen Faucet Repair')).tap();
      
      // Tap edit button
      await element(by.id('edit-job-button')).tap();
      
      // Update job title
      await element(by.id('job-title-input')).clearText();
      await element(by.id('job-title-input')).typeText('Urgent Kitchen Faucet Repair');
      
      await element(by.id('save-changes-button')).tap();
      
      // Should show updated title
      await expect(element(by.text('Urgent Kitchen Faucet Repair'))).toBeVisible();
    });
  });

  describe('Job Browsing Flow (Contractor)', () => {
    beforeEach(async () => {
      // Sign in as contractor
      await element(by.id('sign-in-button')).tap();
      await element(by.id('email-input')).typeText('contractor.test@example.com');
      await element(by.id('password-input')).typeText('TestPassword123!');
      await element(by.id('sign-in-submit-button')).tap();
      await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
    });

    it('should browse available jobs', async () => {
      await element(by.id('jobs-tab')).tap();
      await element(by.id('available-jobs-filter')).tap();
      
      // Should see available jobs
      await expect(element(by.text('Urgent Kitchen Faucet Repair'))).toBeVisible();
      await expect(element(by.text('$150.00'))).toBeVisible();
    });

    it('should view job details and submit bid', async () => {
      await element(by.id('jobs-tab')).tap();
      await element(by.id('available-jobs-filter')).tap();
      
      // Tap on job to view details
      await element(by.text('Urgent Kitchen Faucet Repair')).tap();
      
      await expect(element(by.id('job-details-screen'))).toBeVisible();
      await expect(element(by.text('Leaky kitchen faucet'))).toBeVisible();
      
      // Submit bid
      await element(by.id('submit-bid-button')).tap();
      
      // Fill bid form
      await element(by.id('bid-amount-input')).typeText('145');
      await element(by.id('bid-description-input')).typeText('I can fix this today. 5+ years experience with kitchen plumbing.');
      
      await element(by.id('submit-bid-confirm')).tap();
      
      // Should show success message
      await waitFor(element(by.text('Bid Submitted Successfully!'))).toBeVisible().withTimeout(5000);
    });

    it('should filter jobs by category', async () => {
      await element(by.id('jobs-tab')).tap();
      
      // Apply plumbing filter
      await element(by.id('category-filter')).tap();
      await element(by.text('Plumbing')).tap();
      await element(by.id('apply-filters')).tap();
      
      // Should only show plumbing jobs
      await expect(element(by.text('Urgent Kitchen Faucet Repair'))).toBeVisible();
    });
  });

  describe('Bidding and Acceptance Flow', () => {
    it('should show bid to homeowner and allow acceptance', async () => {
      // Sign in as homeowner
      await element(by.id('sign-in-button')).tap();
      await element(by.id('email-input')).typeText('homeowner.test@example.com');
      await element(by.id('password-input')).typeText('TestPassword123!');
      await element(by.id('sign-in-submit-button')).tap();
      
      // Navigate to job with bids
      await element(by.id('jobs-tab')).tap();
      await element(by.id('my-jobs-filter')).tap();
      await element(by.text('Urgent Kitchen Faucet Repair')).tap();
      
      // Should see bids section
      await element(by.id('bids-section')).swipe('up');
      await expect(element(by.id('bid-card'))).toBeVisible();
      await expect(element(by.text('$145.00'))).toBeVisible();
      await expect(element(by.text('Jane Contractor'))).toBeVisible();
      
      // Accept bid
      await element(by.id('accept-bid-button')).tap();
      await element(by.id('confirm-accept-bid')).tap();
      
      // Should show job assigned status
      await waitFor(element(by.text('Job Assigned'))).toBeVisible().withTimeout(5000);
    });
  });

  describe('Payment Flow', () => {
    it('should initiate payment process', async () => {
      // Continue from assigned job
      await element(by.id('proceed-to-payment-button')).tap();
      
      await expect(element(by.id('payment-screen'))).toBeVisible();
      await expect(element(by.text('Payment Information'))).toBeVisible();
      await expect(element(by.text('$145.00'))).toBeVisible();
    });

    it('should handle payment form', async () => {
      // Fill payment form (mock card)
      await element(by.id('card-number-input')).typeText('4111111111111111');
      await element(by.id('expiry-input')).typeText('12/28');
      await element(by.id('cvc-input')).typeText('123');
      
      await element(by.id('pay-button')).tap();
      
      // Should show processing then success
      await expect(element(by.text('Processing Payment...'))).toBeVisible();
      await waitFor(element(by.text('Payment Successful!'))).toBeVisible().withTimeout(10000);
    });
  });

  describe('Messaging Flow', () => {
    it('should allow messaging between homeowner and contractor', async () => {
      // Navigate to messages
      await element(by.id('messages-tab')).tap();
      
      // Should see conversation with contractor
      await expect(element(by.text('Jane Contractor'))).toBeVisible();
      await element(by.text('Jane Contractor')).tap();
      
      // Send message
      await element(by.id('message-input')).typeText('Hi! When can you start the repair?');
      await element(by.id('send-message-button')).tap();
      
      // Should see message in chat
      await expect(element(by.text('Hi! When can you start the repair?'))).toBeVisible();
    });

    it('should show real-time message delivery', async () => {
      // Mock receiving a message (this would be tested with multiple devices/simulators)
      await waitFor(element(by.text('I can start tomorrow at 9 AM'))).toBeVisible().withTimeout(15000);
      
      // Should show notification badge
      await expect(element(by.id('unread-message-badge'))).toBeVisible();
    });
  });

  describe('Job Completion Flow', () => {
    it('should allow contractor to mark job as completed', async () => {
      // Sign in as contractor
      await element(by.id('profile-tab')).tap();
      await element(by.id('sign-out-button')).tap();
      
      await element(by.id('sign-in-button')).tap();
      await element(by.id('email-input')).typeText('contractor.test@example.com');
      await element(by.id('password-input')).typeText('TestPassword123!');
      await element(by.id('sign-in-submit-button')).tap();
      
      // Navigate to active jobs
      await element(by.id('jobs-tab')).tap();
      await element(by.id('my-jobs-filter')).tap();
      
      await element(by.text('Urgent Kitchen Faucet Repair')).tap();
      
      // Mark as completed
      await element(by.id('mark-complete-button')).tap();
      await element(by.id('completion-notes-input')).typeText('Faucet repaired successfully. No more leaks.');
      await element(by.id('confirm-completion')).tap();
      
      await waitFor(element(by.text('Job Marked as Complete'))).toBeVisible().withTimeout(5000);
    });

    it('should allow homeowner to confirm completion', async () => {
      // Switch back to homeowner account
      await element(by.id('profile-tab')).tap();
      await element(by.id('sign-out-button')).tap();
      
      await element(by.id('sign-in-button')).tap();
      await element(by.id('email-input')).typeText('homeowner.test@example.com');
      await element(by.id('password-input')).typeText('TestPassword123!');
      await element(by.id('sign-in-submit-button')).tap();
      
      // Should see completion notification
      await element(by.id('notifications-tab')).tap();
      await expect(element(by.text('Job Completed'))).toBeVisible();
      
      // Confirm and release payment
      await element(by.text('Job Completed')).tap();
      await element(by.id('confirm-completion-button')).tap();
      await element(by.id('release-payment-button')).tap();
      
      await waitFor(element(by.text('Payment Released Successfully!'))).toBeVisible().withTimeout(5000);
    });
  });

  describe('AI Analysis Feature', () => {
    it('should show AI analysis of job photos', async () => {
      // Create new job with AI analysis
      await element(by.id('post-job-button')).tap();
      
      await element(by.id('job-title-input')).typeText('Electrical Outlet Issue');
      await element(by.id('job-description-input')).typeText('Electrical outlet sparking when plugged in');
      await element(by.id('add-photo-button')).tap();
      await element(by.text('Camera')).tap();
      
      // Wait for AI analysis
      await waitFor(element(by.id('ai-analysis-section'))).toBeVisible().withTimeout(15000);
      
      // Should show safety warnings for electrical issues
      await expect(element(by.text('Safety Concerns'))).toBeVisible();
      await expect(element(by.text('High'))).toBeVisible(); // High severity
      await expect(element(by.text('Turn off power'))).toBeVisible();
    });
  });

  describe('Search and Filter', () => {
    it('should search for jobs by keywords', async () => {
      await element(by.id('jobs-tab')).tap();
      
      await element(by.id('search-input')).typeText('faucet');
      await element(by.id('search-button')).tap();
      
      // Should show filtered results
      await expect(element(by.text('Kitchen Faucet Repair'))).toBeVisible();
    });

    it('should filter jobs by budget range', async () => {
      await element(by.id('filter-button')).tap();
      
      await element(by.id('min-budget-input')).typeText('100');
      await element(by.id('max-budget-input')).typeText('200');
      await element(by.id('apply-filters')).tap();
      
      // Should show jobs in budget range
      await expect(element(by.text('$145.00'))).toBeVisible();
    });
  });

  describe('Profile and Settings', () => {
    it('should allow profile updates', async () => {
      await element(by.id('profile-tab')).tap();
      
      await element(by.id('edit-profile-button')).tap();
      
      await element(by.id('phone-input')).typeText('(555) 123-4567');
      await element(by.id('save-profile-button')).tap();
      
      await expect(element(by.text('Profile Updated Successfully'))).toBeVisible();
    });

    it('should manage notification settings', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('notification-settings-button')).tap();
      
      // Toggle job updates
      await element(by.id('job-updates-toggle')).tap();
      
      await element(by.id('save-settings-button')).tap();
      await expect(element(by.text('Settings Saved'))).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      await device.setURLBlacklist(['https://api.supabase.com/*']);
      
      await element(by.id('jobs-tab')).tap();
      
      // Should show offline message
      await expect(element(by.text('Connection Error'))).toBeVisible();
      await expect(element(by.id('retry-button'))).toBeVisible();
      
      await device.setURLBlacklist([]);
      await element(by.id('retry-button')).tap();
      
      // Should recover
      await waitFor(element(by.id('jobs-list'))).toBeVisible().withTimeout(10000);
    });

    it('should handle payment failures gracefully', async () => {
      // Mock payment failure
      await element(by.id('pay-button')).tap();
      
      // Should show error message
      await expect(element(by.text('Payment Failed'))).toBeVisible();
      await expect(element(by.id('try-again-button'))).toBeVisible();
    });
  });

  describe('Performance Tests', () => {
    it('should load job list quickly', async () => {
      const start = Date.now();
      
      await element(by.id('jobs-tab')).tap();
      await waitFor(element(by.id('jobs-list'))).toBeVisible().withTimeout(5000);
      
      const loadTime = Date.now() - start;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    it('should handle large job lists smoothly', async () => {
      await element(by.id('jobs-tab')).tap();
      
      // Scroll through job list
      for (let i = 0; i < 10; i++) {
        await element(by.id('jobs-list')).scroll(200, 'down');
        await sleep(100);
      }
      
      // Should remain responsive
      await expect(element(by.id('jobs-list'))).toBeVisible();
    });
  });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}