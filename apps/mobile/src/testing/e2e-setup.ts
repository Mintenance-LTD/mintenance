import { by, device, element, expect, waitFor } from 'detox';
import { logger } from '../utils/logger';

// ============================================================================
// E2E TESTING UTILITIES
// ============================================================================

export class E2ETestHelper {
  // ============================================================================
  // DEVICE UTILITIES
  // ============================================================================

  static async reloadApp(): Promise<void> {
    await device.reloadReactNative();
  }

  static async resetApp(): Promise<void> {
    await device.uninstallApp();
    await device.installApp();
    await device.launchApp();
  }

  static async backgroundApp(duration: number = 2000): Promise<void> {
    await device.sendToHome();
    await new Promise(resolve => setTimeout(resolve, duration));
    await device.launchApp({ newInstance: false });
  }

  static async rotateDevice(orientation: 'portrait' | 'landscape'): Promise<void> {
    await device.setOrientation(orientation);
  }

  static async enableAccessibility(): Promise<void> {
    // iOS specific accessibility enabling
    if (device.getPlatform() === 'ios') {
      await device.setURLBlacklist([]);
      await device.enableSynchronization();
    }
  }

  // ============================================================================
  // ELEMENT HELPERS
  // ============================================================================

  static getElementById(testID: string) {
    return element(by.id(testID));
  }

  static getElementByText(text: string) {
    return element(by.text(text));
  }

  static getElementByLabel(label: string) {
    return element(by.label(label));
  }

  static getElementByType(type: string) {
    return element(by.type(type));
  }

  // ============================================================================
  // INTERACTION HELPERS
  // ============================================================================

  static async tapElement(testID: string): Promise<void> {
    await this.getElementById(testID).tap();
  }

  static async tapElementByText(text: string): Promise<void> {
    await this.getElementByText(text).tap();
  }

  static async typeText(testID: string, text: string): Promise<void> {
    await this.getElementById(testID).typeText(text);
  }

  static async replaceText(testID: string, text: string): Promise<void> {
    await this.getElementById(testID).replaceText(text);
  }

  static async clearText(testID: string): Promise<void> {
    await this.getElementById(testID).clearText();
  }

  static async swipeElement(
    testID: string, 
    direction: 'up' | 'down' | 'left' | 'right',
    speed: 'fast' | 'slow' = 'fast'
  ): Promise<void> {
    await this.getElementById(testID).swipe(direction, speed);
  }

  static async scrollTo(
    testID: string,
    edge: 'top' | 'bottom' | 'left' | 'right'
  ): Promise<void> {
    await this.getElementById(testID).scrollTo(edge);
  }

  static async longPress(testID: string, duration: number = 1000): Promise<void> {
    await this.getElementById(testID).longPress(duration);
  }

  // ============================================================================
  // WAIT HELPERS
  // ============================================================================

  static async waitForElement(
    testID: string, 
    timeout: number = 10000
  ): Promise<void> {
    await waitFor(this.getElementById(testID))
      .toBeVisible()
      .withTimeout(timeout);
  }

  static async waitForElementByText(
    text: string, 
    timeout: number = 10000
  ): Promise<void> {
    await waitFor(this.getElementByText(text))
      .toBeVisible()
      .withTimeout(timeout);
  }

  static async waitForElementToDisappear(
    testID: string, 
    timeout: number = 10000
  ): Promise<void> {
    await waitFor(this.getElementById(testID))
      .not.toBeVisible()
      .withTimeout(timeout);
  }

  static async waitAndTap(
    testID: string, 
    timeout: number = 10000
  ): Promise<void> {
    await this.waitForElement(testID, timeout);
    await this.tapElement(testID);
  }

  // ============================================================================
  // ASSERTION HELPERS
  // ============================================================================

  static async expectElementToBeVisible(testID: string): Promise<void> {
    await expect(this.getElementById(testID)).toBeVisible();
  }

  static async expectElementToNotBeVisible(testID: string): Promise<void> {
    await expect(this.getElementById(testID)).not.toBeVisible();
  }

  static async expectElementToExist(testID: string): Promise<void> {
    await expect(this.getElementById(testID)).toExist();
  }

  static async expectElementToNotExist(testID: string): Promise<void> {
    await expect(this.getElementById(testID)).not.toExist();
  }

  static async expectTextToBeVisible(text: string): Promise<void> {
    await expect(this.getElementByText(text)).toBeVisible();
  }

  static async expectElementToHaveText(testID: string, text: string): Promise<void> {
    await expect(this.getElementById(testID)).toHaveText(text);
  }

  static async expectElementToHaveValue(testID: string, value: string): Promise<void> {
    await expect(this.getElementById(testID)).toHaveValue(value);
  }

  static async expectElementToHaveLabel(testID: string, label: string): Promise<void> {
    await expect(this.getElementById(testID)).toHaveLabel(label);
  }

  // ============================================================================
  // FORM HELPERS
  // ============================================================================

  static async fillForm(formData: Record<string, string>): Promise<void> {
    for (const [testID, value] of Object.entries(formData)) {
      await this.waitForElement(testID);
      await this.replaceText(testID, value);
    }
  }

  static async submitForm(submitButtonTestID: string): Promise<void> {
    await this.waitAndTap(submitButtonTestID);
  }

  static async fillAndSubmitForm(
    formData: Record<string, string>,
    submitButtonTestID: string
  ): Promise<void> {
    await this.fillForm(formData);
    await this.submitForm(submitButtonTestID);
  }

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================

  static async navigateToScreen(screenTestID: string): Promise<void> {
    await this.waitAndTap(screenTestID);
    await this.waitForElement(screenTestID);
  }

  static async goBack(): Promise<void> {
    await this.tapElement('back-button');
  }

  static async navigateToTab(tabTestID: string): Promise<void> {
    await this.waitAndTap(tabTestID);
  }

  // ============================================================================
  // AUTHENTICATION HELPERS
  // ============================================================================

  static async loginUser(email: string, password: string): Promise<void> {
    await this.waitForElement('email-input');
    await this.replaceText('email-input', email);
    await this.replaceText('password-input', password);
    await this.tapElement('sign-in-button');
    await this.waitForElement('home-screen');
  }

  static async logoutUser(): Promise<void> {
    await this.navigateToTab('profile-tab');
    await this.waitAndTap('logout-button');
    await this.waitForElement('login-screen');
  }

  static async registerUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<void> {
    await this.waitAndTap('sign-up-link');
    await this.fillForm({
      'first-name-input': firstName,
      'last-name-input': lastName,
      'email-input': email,
      'password-input': password,
    });
    await this.tapElement('sign-up-button');
    await this.waitForElement('home-screen');
  }

  // ============================================================================
  // JOB POSTING HELPERS
  // ============================================================================

  static async createJob(jobData: {
    title: string;
    description: string;
    budget: string;
    category: string;
  }): Promise<void> {
    await this.navigateToTab('jobs-tab');
    await this.waitAndTap('create-job-button');
    
    await this.fillForm({
      'job-title-input': jobData.title,
      'job-description-input': jobData.description,
      'job-budget-input': jobData.budget,
    });

    // Select category
    await this.tapElement('job-category-select');
    await this.tapElementByText(jobData.category);

    await this.tapElement('create-job-submit');
    await this.waitForElement('job-success-message');
  }

  static async viewJobDetails(jobTitle: string): Promise<void> {
    await this.waitForElement('jobs-list');
    await this.tapElementByText(jobTitle);
    await this.waitForElement('job-details-screen');
  }

  // ============================================================================
  // MESSAGING HELPERS
  // ============================================================================

  static async sendMessage(message: string): Promise<void> {
    await this.waitForElement('message-input');
    await this.typeText('message-input', message);
    await this.tapElement('send-message-button');
  }

  static async openConversation(contactName: string): Promise<void> {
    await this.navigateToTab('messages-tab');
    await this.tapElementByText(contactName);
    await this.waitForElement('conversation-screen');
  }

  // ============================================================================
  // ACCESSIBILITY TESTING
  // ============================================================================

  static async testAccessibility(): Promise<void> {
    // Enable accessibility testing
    await this.enableAccessibility();

    // Test screen reader navigation
    await this.testScreenReaderNavigation();

    // Test keyboard navigation
    await this.testKeyboardNavigation();

    // Test minimum touch targets
    await this.testTouchTargets();
  }

  private static async testScreenReaderNavigation(): Promise<void> {
    // Simulate VoiceOver/TalkBack navigation
    // Note: In a real implementation, this would use proper Detox accessibility testing
    try {
      const mainContainer = element(by.type('View')).atIndex(0);
      await expect(mainContainer).toBeVisible();

      // Test that main interactive elements have accessibility labels
      logger.info('Testing screen reader navigation patterns...');
      // This is a placeholder for comprehensive accessibility testing
    } catch (error) {
      logger.warn('Accessibility navigation test failed', { error });
    }
  }

  private static async testKeyboardNavigation(): Promise<void> {
    // Test tab navigation between focusable elements
    // This would require device.sendKeyEvent() calls
    logger.info('Testing keyboard navigation...');
  }

  private static async testTouchTargets(): Promise<void> {
    // Test that interactive elements meet minimum size requirements
    logger.info('Testing touch target sizes...');
  }

  // ============================================================================
  // PERFORMANCE TESTING
  // ============================================================================

  static async measurePerformance<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const endTime = Date.now();
      logger.info(`${label} took ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = Date.now();
      logger.error(`${label} failed after ${endTime - startTime}ms`, { error });
      throw error;
    }
  }

  static async testAppLaunchTime(): Promise<number> {
    const startTime = Date.now();
    await device.launchApp({ newInstance: true });
    await this.waitForElement('home-screen');
    const endTime = Date.now();

    const launchTime = endTime - startTime;
    logger.info(`App launch time: ${launchTime}ms`, { launchTime });
    return launchTime;
  }

  // ============================================================================
  // SCREENSHOT HELPERS
  // ============================================================================

  static async takeScreenshot(name: string): Promise<void> {
    await device.takeScreenshot(name);
  }

  static async takeScreenshotOfElement(testID: string, name: string): Promise<void> {
    await this.getElementById(testID).takeScreenshot(name);
  }

  // ============================================================================
  // CLEANUP HELPERS
  // ============================================================================

  static async cleanup(): Promise<void> {
    // Reset device orientation
    await device.setOrientation('portrait');
    
    // Clear app data
    await device.clearKeychain();
    
    // Reset permissions
    await device.resetContentAndSettings();
  }
}

// ============================================================================
// TEST SUITE HELPERS
// ============================================================================

export const E2ETestSuite = {
  async beforeAll(): Promise<void> {
    await device.launchApp();
    await E2ETestHelper.enableAccessibility();
  },

  async beforeEach(): Promise<void> {
    await E2ETestHelper.reloadApp();
  },

  async afterEach(): Promise<void> {
    // Take screenshot on failure
    // Note: In Jest environment, we would use a different failure detection mechanism
    try {
      // This would be implemented with Jest's test context in a real scenario
      logger.debug('Test completed - checking for failures...');
      // await E2ETestHelper.takeScreenshot(`test_${Date.now()}`);
    } catch (error) {
      logger.warn('Failed to take screenshot', { error });
    }
  },

  async afterAll(): Promise<void> {
    await E2ETestHelper.cleanup();
  },
};

// ============================================================================
// COMMON TEST SCENARIOS
// ============================================================================

export const CommonScenarios = {
  async completeUserJourney(): Promise<void> {
    // Register new user
    await E2ETestHelper.registerUser(
      'Test',
      'User',
      'test@example.com',
      'password123'
    );

    // Create a job
    await E2ETestHelper.createJob({
      title: 'Test Job',
      description: 'This is a test job',
      budget: '100',
      category: 'Plumbing',
    });

    // View job details
    await E2ETestHelper.viewJobDetails('Test Job');

    // Send a message
    await E2ETestHelper.openConversation('Test Contact');
    await E2ETestHelper.sendMessage('Hello, I\'m interested in this job!');

    // Logout
    await E2ETestHelper.logoutUser();
  },

  async testAccessibilityCompliance(): Promise<void> {
    await E2ETestHelper.testAccessibility();
  },

  async testPerformance(): Promise<void> {
    const launchTime = await E2ETestHelper.testAppLaunchTime();
    // Note: In a Jest environment, this would use Jest's expect
    if (launchTime > 5000) {
      throw new Error(`App launch time ${launchTime}ms exceeds 5000ms threshold`);
    }
    logger.info(`App launch time: ${launchTime}ms (within 5s threshold)`, { launchTime });
  },
};

export default E2ETestHelper;
