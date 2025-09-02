/**
 * E2E Testing Helper Functions
 * Reusable utilities for mobile app testing
 */

class TestHelpers {
  /**
   * Wait for element with custom timeout and error message
   */
  static async waitForElement(elementId, timeout = 10000, errorMessage) {
    try {
      await waitFor(element(by.id(elementId)))
        .toBeVisible()
        .withTimeout(timeout);
    } catch (error) {
      throw new Error(errorMessage || `Element ${elementId} not visible after ${timeout}ms`);
    }
  }

  /**
   * Sign in as test user
   */
  static async signInAsUser(email, password) {
    await element(by.id('sign-in-button')).tap();
    await element(by.id('email-input')).replaceText(email);
    await element(by.id('password-input')).replaceText(password);
    await element(by.id('sign-in-submit-button')).tap();
    
    await this.waitForElement('home-screen', 15000, 'Failed to sign in user');
  }

  /**
   * Sign out current user
   */
  static async signOut() {
    try {
      await element(by.id('profile-tab')).tap();
      await element(by.id('sign-out-button')).tap();
      await this.waitForElement('welcome-screen', 5000);
    } catch (error) {
      // If already signed out, continue
      console.log('User already signed out or sign out failed');
    }
  }

  /**
   * Create test job posting
   */
  static async createTestJob(jobData = {}) {
    const defaultData = {
      title: 'Test Job',
      description: 'Test job description',
      location: '123 Test St',
      budget: '100',
      category: 'General',
      priority: 'medium'
    };

    const data = { ...defaultData, ...jobData };

    await element(by.id('post-job-button')).tap();
    await this.waitForElement('post-job-screen');

    await element(by.id('job-title-input')).replaceText(data.title);
    await element(by.id('job-description-input')).replaceText(data.description);
    await element(by.id('job-location-input')).replaceText(data.location);
    await element(by.id('job-budget-input')).replaceText(data.budget);

    if (data.category !== 'General') {
      await element(by.id('category-picker')).tap();
      await element(by.text(data.category)).tap();
    }

    await element(by.id(`priority-${data.priority}`)).tap();
    await element(by.id('post-job-submit')).tap();

    await this.waitForElement('job-details-screen', 10000, 'Job creation failed');
    return data;
  }

  /**
   * Navigate to tab safely
   */
  static async navigateToTab(tabId) {
    await element(by.id(tabId)).tap();
    // Add small delay for tab transition
    await this.sleep(500);
  }

  /**
   * Fill form fields
   */
  static async fillForm(fields) {
    for (const [fieldId, value] of Object.entries(fields)) {
      await element(by.id(fieldId)).replaceText(value);
    }
  }

  /**
   * Take screenshot with descriptive name
   */
  static async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await device.takeScreenshot(`${name}_${timestamp}`);
  }

  /**
   * Verify elements are visible
   */
  static async verifyElementsVisible(elementIds) {
    for (const elementId of elementIds) {
      await expect(element(by.id(elementId))).toBeVisible();
    }
  }

  /**
   * Verify text content
   */
  static async verifyTextVisible(texts) {
    for (const text of texts) {
      await expect(element(by.text(text))).toBeVisible();
    }
  }

  /**
   * Scroll to element
   */
  static async scrollToElement(elementId, scrollViewId = 'scroll-view') {
    try {
      await element(by.id(elementId)).scrollTo('top');
    } catch (error) {
      // Try alternative scrolling approach
      await element(by.id(scrollViewId)).scrollTo('bottom');
      await element(by.id(scrollViewId)).scroll(300, 'up', NaN, 0.5);
    }
  }

  /**
   * Handle alert dialogs
   */
  static async handleAlert(action = 'OK') {
    try {
      await element(by.text(action)).tap();
    } catch (error) {
      console.log(`No alert found or action ${action} not available`);
    }
  }

  /**
   * Simulate network conditions
   */
  static async setNetworkCondition(condition) {
    switch (condition) {
      case 'offline':
        await device.setURLBlacklist(['*']);
        break;
      case 'slow':
        await device.setURLBlacklist([]);
        // Simulate slow network by adding delays
        await this.sleep(2000);
        break;
      case 'online':
      default:
        await device.setURLBlacklist([]);
        break;
    }
  }

  /**
   * Wait with timeout
   */
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry action with exponential backoff
   */
  static async retryAction(action, maxRetries = 3, initialDelay = 1000) {
    let retries = 0;
    let delay = initialDelay;

    while (retries < maxRetries) {
      try {
        await action();
        return; // Success
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw error; // Max retries reached
        }
        
        console.log(`Action failed, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
        await this.sleep(delay);
        delay *= 2; // Exponential backoff
      }
    }
  }

  /**
   * Setup test environment
   */
  static async setupTestEnvironment() {
    // Clear app data
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: {
        camera: 'YES',
        photos: 'YES',
        location: 'always',
        notifications: 'YES'
      }
    });

    // Wait for app to fully load
    await this.waitForElement('welcome-screen', 30000, 'App failed to launch');
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData() {
    try {
      // Sign out if signed in
      await this.signOut();
      
      // Clear any cached data
      await device.launchApp({ newInstance: true });
    } catch (error) {
      console.log('Cleanup failed:', error.message);
    }
  }

  /**
   * Mock payment success
   */
  static async mockPaymentSuccess() {
    // This would integrate with your backend test environment
    // to simulate successful payment processing
    await this.sleep(2000); // Simulate processing time
  }

  /**
   * Generate test data
   */
  static generateTestData() {
    const timestamp = Date.now();
    return {
      homeowner: {
        email: `homeowner.${timestamp}@testapp.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Homeowner'
      },
      contractor: {
        email: `contractor.${timestamp}@testapp.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Contractor'
      },
      job: {
        title: `Test Job ${timestamp}`,
        description: 'Test job for automated testing',
        location: '123 Test Street, Test City',
        budget: '150',
        category: 'Plumbing'
      }
    };
  }

  /**
   * Verify app performance
   */
  static async measurePerformance(action, actionName, maxTime = 3000) {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`${actionName} took ${duration}ms`);
    expect(duration).toBeLessThan(maxTime);
    
    return duration;
  }

  /**
   * Test accessibility
   */
  static async verifyAccessibility() {
    // Check for accessibility labels
    const importantElements = [
      'sign-in-button',
      'sign-up-button', 
      'post-job-button',
      'jobs-tab',
      'messages-tab',
      'profile-tab'
    ];

    for (const elementId of importantElements) {
      const element = by.id(elementId);
      await expect(element).toBeVisible();
      // Verify accessibility label exists
      await expect(element).toHaveAccessibilityLabel();
    }
  }

  /**
   * Test different device orientations
   */
  static async testOrientations(testFn) {
    // Portrait
    await device.setOrientation('portrait');
    await testFn();

    // Landscape (if supported)
    await device.setOrientation('landscape');
    await testFn();

    // Return to portrait
    await device.setOrientation('portrait');
  }

  /**
   * Simulate deep link navigation
   */
  static async openDeepLink(url) {
    await device.openURL({ url });
    await this.sleep(2000); // Wait for navigation
  }

  /**
   * Test notification handling
   */
  static async sendTestNotification(payload) {
    await device.sendUserNotification({
      trigger: {
        type: 'push',
      },
      title: payload.title || 'Test Notification',
      body: payload.body || 'Test notification body',
      badge: payload.badge || 1,
      payload: payload.data || {}
    });
  }

  /**
   * Memory usage monitoring
   */
  static async checkMemoryUsage() {
    // This would require native module integration
    // For now, just log a placeholder
    console.log('Memory usage check - implement with native module');
  }

  /**
   * Device-specific testing
   */
  static async getDeviceInfo() {
    const platform = await device.getPlatform();
    console.log(`Running on ${platform}`);
    return platform;
  }
}

module.exports = TestHelpers;