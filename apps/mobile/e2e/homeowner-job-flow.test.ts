import { loginAsHomeowner, navigateToTab } from './helpers';

describe('Homeowner Job Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsHomeowner();
  });

  it('should display the home screen with key sections', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should navigate to Jobs tab', async () => {
    await navigateToTab('Jobs');
    // Wait for jobs list to appear
    await waitFor(element(by.text('My Jobs')).or(element(by.text('Jobs'))))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should open the create job flow', async () => {
    // Tap the "+" / Add tab which triggers the ServiceRequest modal
    await navigateToTab('Add');

    // Should see the service request / job creation form
    await waitFor(
      element(by.text('New Job').or(element(by.text('Service Request')))),
    )
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to Messages tab', async () => {
    // Go back to messages
    await navigateToTab('Messages');

    await waitFor(element(by.text('Messages')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to Profile tab', async () => {
    await navigateToTab('Profile');

    await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to Discover tab and see contractors', async () => {
    await navigateToTab('Discover');

    await waitFor(
      element(
        by
          .text('Find Contractors')
          .or(element(by.text('Discover'))),
      ),
    )
      .toBeVisible()
      .withTimeout(10000);
  });
});
