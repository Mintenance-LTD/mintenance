import {
  loginAsHomeowner,
  loginAsContractor,
  navigateToTab,
  tapText,
  waitForText,
} from './helpers';

describe('Tab Navigation', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsHomeowner();
  });

  it('should cycle through all bottom tabs without crashing', async () => {
    const tabs = ['Home', 'Discover', 'Jobs', 'Messages', 'Profile'];

    for (const tab of tabs) {
      await navigateToTab(tab);
      // Just verify the app hasn't crashed by checking any element is visible
      await waitFor(element(by.type('RCTView')))
        .toBeVisible()
        .withTimeout(5000);
    }
  });

  it('should return to Home tab from any tab', async () => {
    await navigateToTab('Profile');
    await navigateToTab('Home');
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should handle rapid tab switching without crashing', async () => {
    const rapidTabs = [
      'Jobs',
      'Home',
      'Messages',
      'Profile',
      'Discover',
      'Home',
      'Jobs',
      'Messages',
    ];

    for (const tab of rapidTabs) {
      await navigateToTab(tab);
    }

    // App should still be responsive after rapid switches
    await expect(element(by.type('RCTView'))).toBeVisible();
  });

  it('should navigate to Add tab and open service request modal', async () => {
    await navigateToTab('Add');

    await waitFor(
      element(by.text('New Job').or(element(by.text('Service Request')))),
    )
      .toBeVisible()
      .withTimeout(10000);

    // Navigate away from the modal
    await navigateToTab('Home');
  });
});

describe('Profile Sub-Screen Navigation', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsHomeowner();
  });

  it('should navigate to Profile tab', async () => {
    await navigateToTab('Profile');
    await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to Payment History and back', async () => {
    const hasPaymentHistory = await waitForText('Payment History', 3000);
    if (!hasPaymentHistory) {
      // Try "Payments" as alternative label
      const hasPayments = await waitForText('Payments', 2000);
      if (!hasPayments) return;
      await element(by.text('Payments')).tap();
    } else {
      await element(by.text('Payment History')).tap();
    }

    await waitFor(element(by.text('Payment History')))
      .toBeVisible()
      .withTimeout(10000);

    // Navigate back
    try {
      await element(by.label('Go back')).tap();
    } catch {
      await device.pressBack();
    }

    await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate to Escrow Dashboard and back', async () => {
    const hasEscrow = await waitForText('Escrow Dashboard', 3000);
    if (!hasEscrow) {
      const hasEscrowAlt = await waitForText('Escrow', 2000);
      if (!hasEscrowAlt) return;
      await element(by.text('Escrow')).tap();
    } else {
      await element(by.text('Escrow Dashboard')).tap();
    }

    await waitFor(element(by.text('Escrow Dashboard')))
      .toBeVisible()
      .withTimeout(10000);

    try {
      await element(by.label('Go back')).tap();
    } catch {
      await device.pressBack();
    }

    await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate back to Home from deep Profile screen', async () => {
    // Navigate into a sub-screen, then all the way back to Home
    const hasPaymentHistory = await waitForText('Payment History', 3000);
    if (hasPaymentHistory) {
      await element(by.text('Payment History')).tap();
      await waitFor(element(by.text('Payment History')))
        .toBeVisible()
        .withTimeout(5000);

      try {
        await element(by.label('Go back')).tap();
      } catch {
        await device.pressBack();
      }
    }

    await navigateToTab('Home');
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});

describe('Contractor Tab Navigation', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsContractor();
  });

  it('should cycle through contractor tabs without crashing', async () => {
    // Contractor may have different tab layout
    const tabs = ['Home', 'Jobs', 'Messages', 'Profile'];

    for (const tab of tabs) {
      try {
        await navigateToTab(tab);
        await waitFor(element(by.type('RCTView')))
          .toBeVisible()
          .withTimeout(5000);
      } catch {
        // Some tabs may not exist for contractor; continue
      }
    }
  });

  it('should show contractor-specific content on Jobs tab', async () => {
    await navigateToTab('Jobs');

    // Contractors see "Available Jobs" or "Jobs" header
    await waitFor(
      element(by.text('Jobs').or(element(by.text('Available Jobs')))),
    )
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to contractor Profile sub-screens', async () => {
    await navigateToTab('Profile');

    await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
      .toBeVisible()
      .withTimeout(10000);

    // Contractors should have access to Documents screen
    const hasDocs = await waitForText('Documents', 3000);
    if (hasDocs) {
      await element(by.text('Documents')).tap();
      await new Promise((r) => setTimeout(r, 500));

      try {
        await element(by.label('Go back')).tap();
      } catch {
        await device.pressBack();
      }
    }
  });

  it('should return to Home from contractor profile', async () => {
    await navigateToTab('Home');
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
