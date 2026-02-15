import { loginAsHomeowner, navigateToTab } from './helpers';

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
});
