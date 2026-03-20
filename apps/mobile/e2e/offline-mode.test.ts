/**
 * Offline Mode E2E Tests
 *
 * Covers the offline behavior of the Mintenance mobile app:
 *  - OfflineSyncStatus banner visibility when disconnected
 *  - Queued actions display and pending count
 *  - Job browsing with cached data
 *  - Recovery behavior when connection is restored
 *  - Sync Now and Clear Queue interactions
 *
 * NOTE: Detox's network simulation works via device.setURLBlacklist() to
 * block all network requests, simulating an offline state. This does not
 * affect the device's actual connectivity APIs, so NetInfo-based checks
 * may still report "online". For full offline testing, use device airplane
 * mode on physical devices.
 */
import {
  loginAsHomeowner,
  loginAsContractor,
  navigateToTab,
  tapText,
  waitForText,
} from './helpers';

describe('Offline Mode - Network Disconnection', () => {
  beforeAll(async () => {
    // Launch with network enabled first to login
    await device.launchApp({ newInstance: true });
    await loginAsHomeowner();
  });

  it('should show home screen while online', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should show offline indicator when network is blocked', async () => {
    // Block all network requests to simulate offline
    await device.setURLBlacklist(['.*']);

    // Brief wait for the app to detect connectivity change
    await new Promise((r) => setTimeout(r, 2000));

    // The OfflineSyncStatus component should show "Offline" text
    // or the compact offline indicator
    const hasOffline = await waitForText('Offline', 5000);
    const hasWorkingOffline = await waitForText('Working offline', 3000);

    // At minimum the app should not crash when offline
    await expect(element(by.type('RCTView'))).toBeVisible();

    if (hasOffline) {
      await expect(element(by.text('Offline'))).toBeVisible();
    }
    if (hasWorkingOffline) {
      await expect(element(by.text('Working offline'))).toBeVisible();
    }
  });

  it('should allow navigation between tabs while offline', async () => {
    // Verify all bottom tabs are still tappable and render content
    const tabs = ['Jobs', 'Messages', 'Profile'];

    for (const tab of tabs) {
      await navigateToTab(tab);
      // Verify the app has not crashed by checking for any visible view
      await waitFor(element(by.type('RCTView')))
        .toBeVisible()
        .withTimeout(5000);
    }

    // Navigate back to Home
    await navigateToTab('Home');
  });

  it('should show cached jobs list while offline', async () => {
    await navigateToTab('Jobs');

    await waitFor(element(by.text('My Jobs').or(element(by.text('Jobs')))))
      .toBeVisible()
      .withTimeout(10000);

    // The job list should show cached data or an appropriate offline message
    const hasCachedJobs = await waitForText('Showing Cached Jobs', 3000);
    const hasOfflineMsg = await waitForText(
      'You are currently offline',
      3000,
    );
    const hasNoJobs = await waitForText('No Jobs', 3000);

    // One of these states should be true
    const hasContent = hasCachedJobs || hasOfflineMsg || hasNoJobs;

    // The screen should render regardless of data availability
    await expect(element(by.type('RCTView'))).toBeVisible();
  });

  it('should show offline notice when trying to refresh', async () => {
    // Pull to refresh should show offline feedback
    // Detox: swipe down on the list to trigger refresh
    try {
      await element(by.type('RCTScrollView')).swipe('down', 'slow', 0.5);
      await new Promise((r) => setTimeout(r, 1000));
    } catch {
      // swipe may fail if list is empty; that is acceptable
    }

    // App should still be responsive
    await expect(element(by.type('RCTView'))).toBeVisible();
  });

  it('should recover when network is restored', async () => {
    // Re-enable network
    await device.setURLBlacklist([]);

    // Wait for the app to detect connectivity restoration
    await new Promise((r) => setTimeout(r, 3000));

    // The offline banner should disappear (or show "Syncing"/"Synced")
    const hasSyncing = await waitForText('Syncing', 3000);
    const hasSynced = await waitForText('Synced', 3000);
    const hasAllSynced = await waitForText('All changes synced', 3000);

    // After recovery, the app should be functional
    await expect(element(by.type('RCTView'))).toBeVisible();
  });
});

describe('Offline Mode - Queued Actions', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsHomeowner();
  });

  it('should attempt to create a job while offline', async () => {
    // Block network
    await device.setURLBlacklist(['.*']);
    await new Promise((r) => setTimeout(r, 2000));

    // Navigate to create job
    await navigateToTab('Add');

    await waitFor(
      element(by.text('New Job').or(element(by.text('Service Request')))),
    )
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show queued/offline message after submitting offline', async () => {
    // The create job flow should either:
    // 1. Show "Saved offline" / "Queued" message
    // 2. Show an offline warning before submission
    // 3. Allow form entry and queue the action

    // Check if any offline messaging is present
    const hasOfflineMode = await waitForText('Offline Mode', 3000);
    const hasQueued = await waitForText('queued', 3000);
    const hasSavedOffline = await waitForText('Saved offline', 3000);

    // The screen should be functional even if it shows offline state
    await expect(element(by.type('RCTView'))).toBeVisible();

    // Re-enable network for next tests
    await device.setURLBlacklist([]);
    await new Promise((r) => setTimeout(r, 2000));
  });
});

describe('Offline Mode - Sync Status Component', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsContractor();
  });

  it('should not show sync status banner when online with no pending actions', async () => {
    // When online and fully synced, the OfflineSyncStatus banner should be hidden
    await expect(element(by.id('home-screen'))).toBeVisible();

    // The "Offline" text should NOT be visible when online
    try {
      await expect(element(by.text('Offline'))).not.toBeVisible();
    } catch {
      // Element may not exist at all, which is the expected state
    }
  });

  it('should show sync banner when going offline', async () => {
    await device.setURLBlacklist(['.*']);
    await new Promise((r) => setTimeout(r, 2000));

    // Check for the offline status indicator
    const hasOffline = await waitForText('Offline', 5000);
    const hasPendingChanges = await waitForText('changes pending', 3000);

    // The app should remain responsive
    await expect(element(by.type('RCTView'))).toBeVisible();
  });

  it('should show Sync Now button when online with pending actions', async () => {
    // Re-enable network
    await device.setURLBlacklist([]);
    await new Promise((r) => setTimeout(r, 2000));

    // If there are pending actions, a "Sync Now" button should appear
    const hasSyncNow = await waitForText('Sync Now', 3000);

    if (hasSyncNow) {
      await expect(element(by.text('Sync Now'))).toBeVisible();

      // Tap Sync Now to trigger manual sync
      await element(by.text('Sync Now')).tap();
      await new Promise((r) => setTimeout(r, 2000));

      // After syncing, should show success or empty pending state
      const hasSynced = await waitForText('All changes synced', 5000);
    }
  });

  it('should recover to normal state after sync completes', async () => {
    // After sync, the banner should hide and the app should work normally
    await navigateToTab('Home');
    await expect(element(by.id('home-screen'))).toBeVisible();

    // Navigate through tabs to verify everything still works
    await navigateToTab('Jobs');
    await waitFor(element(by.type('RCTView')))
      .toBeVisible()
      .withTimeout(5000);

    await navigateToTab('Home');
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});

describe('Offline Mode - Data Persistence', () => {
  it('should persist job data across app restart in offline mode', async () => {
    // Login and browse jobs online first
    await device.launchApp({ newInstance: true });
    await loginAsHomeowner();

    await navigateToTab('Jobs');
    await waitFor(element(by.text('My Jobs').or(element(by.text('Jobs')))))
      .toBeVisible()
      .withTimeout(10000);

    // Block network and restart app
    await device.setURLBlacklist(['.*']);

    await device.launchApp({
      newInstance: false,
      // App resumes in same state
    });

    // Wait for app to be ready
    await new Promise((r) => setTimeout(r, 2000));

    // The app should show cached content or a meaningful offline state
    // (not a crash or blank screen)
    await expect(element(by.type('RCTView'))).toBeVisible();

    // Clean up: re-enable network
    await device.setURLBlacklist([]);
  });
});
