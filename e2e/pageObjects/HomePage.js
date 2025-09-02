/**
 * Home Page Object Model
 * Encapsulates interactions with the home screen
 */

class HomePage {
  // Element selectors
  get welcomeMessage() { return element(by.id('welcome-message')); }
  get postJobButton() { return element(by.id('post-job-button')); }
  get browseJobsButton() { return element(by.id('browse-jobs-button')); }
  get quickActionsSection() { return element(by.id('quick-actions')); }
  get recentJobsSection() { return element(by.id('recent-jobs')); }
  get notificationBadge() { return element(by.id('notification-badge')); }
  get searchBar() { return element(by.id('search-bar')); }
  get filterButton() { return element(by.id('filter-button')); }

  // Navigation elements
  get jobsTab() { return element(by.id('jobs-tab')); }
  get messagesTab() { return element(by.id('messages-tab')); }
  get notificationsTab() { return element(by.id('notifications-tab')); }
  get profileTab() { return element(by.id('profile-tab')); }

  // Actions
  async waitForScreenToLoad() {
    await waitFor(this.welcomeMessage)
      .toBeVisible()
      .withTimeout(10000);
  }

  async postNewJob() {
    await this.postJobButton.tap();
  }

  async browseAvailableJobs() {
    await this.browseJobsButton.tap();
  }

  async navigateToJobs() {
    await this.jobsTab.tap();
  }

  async navigateToMessages() {
    await this.messagesTab.tap();
  }

  async navigateToNotifications() {
    await this.notificationsTab.tap();
  }

  async navigateToProfile() {
    await this.profileTab.tap();
  }

  async searchForJobs(query) {
    await this.searchBar.tap();
    await this.searchBar.typeText(query);
    await element(by.id('search-submit')).tap();
  }

  async openFilters() {
    await this.filterButton.tap();
  }

  async getNotificationCount() {
    try {
      const badge = await this.notificationBadge;
      return await badge.getText();
    } catch (error) {
      return '0';
    }
  }

  // Verification methods
  async verifyHomeScreenVisible() {
    await expect(this.welcomeMessage).toBeVisible();
    await expect(this.postJobButton).toBeVisible();
    await expect(this.browseJobsButton).toBeVisible();
  }

  async verifyUserRole(role) {
    if (role === 'homeowner') {
      await expect(this.postJobButton).toBeVisible();
      await expect(element(by.text('Post a Job'))).toBeVisible();
    } else if (role === 'contractor') {
      await expect(this.browseJobsButton).toBeVisible();
      await expect(element(by.text('Find Jobs'))).toBeVisible();
    }
  }

  async verifyRecentJobs(expectedCount) {
    const jobCards = element(by.id('recent-job-card'));
    await expect(jobCards).toHaveCount(expectedCount);
  }

  async verifyQuickActions() {
    await expect(this.quickActionsSection).toBeVisible();
    await expect(element(by.text('Quick Actions'))).toBeVisible();
  }

  // Utility methods
  async refreshScreen() {
    await element(by.id('refresh-control')).swipe('down', 'fast', 0.5);
  }

  async takeScreenshot(name = 'home-screen') {
    await device.takeScreenshot(name);
  }
}

module.exports = HomePage;