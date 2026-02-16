import { loginAsContractor, navigateToTab } from './helpers';

describe('Contractor Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsContractor();
  });

  it('should display the contractor home screen', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should navigate to Jobs tab and see available jobs', async () => {
    await navigateToTab('Jobs');

    await waitFor(
      element(by.text('Jobs').or(element(by.text('Available Jobs')))),
    )
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to Messages tab', async () => {
    await navigateToTab('Messages');

    await waitFor(element(by.text('Messages')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to Profile tab and see contractor settings', async () => {
    await navigateToTab('Profile');

    await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
      .toBeVisible()
      .withTimeout(10000);
  });
});
