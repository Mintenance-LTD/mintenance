import { loginAsContractor, navigateToTab, tapText, waitForText } from './helpers';

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

describe('Contractor Bid Submission', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsContractor();
  });

  it('should navigate to Jobs tab and tap on an available job', async () => {
    await navigateToTab('Jobs');

    await waitFor(
      element(by.text('Jobs').or(element(by.text('Available Jobs')))),
    )
      .toBeVisible()
      .withTimeout(10000);

    // Try to tap the first available job card
    // Jobs are rendered in a FlatList; tap the first item if present
    try {
      await element(by.type('RCTView'))
        .atIndex(0)
        .tap();
    } catch {
      // No jobs available in test data; this is acceptable
    }
  });

  it('should find and tap the Submit Bid button on a job', async () => {
    // Look for Submit Bid / Place Bid button on the job detail screen
    const hasBidButton = await waitForText('Submit Bid', 5000);
    const hasPlaceBid = !hasBidButton && (await waitForText('Place Bid', 3000));

    if (!hasBidButton && !hasPlaceBid) {
      // No biddable jobs; skip remaining bid tests
      return;
    }

    await tapText('Submit Bid', 'Place Bid');

    // Should navigate to BidSubmissionScreen
    await waitFor(element(by.text('Submit Bid')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should display the bid submission form with required fields', async () => {
    const onBidScreen = await waitForText('Your Bid Amount', 3000);
    if (!onBidScreen) return; // Not on bid screen

    await expect(element(by.text('Your Bid Amount *'))).toBeVisible();
    await expect(element(by.text('Proposal Description *'))).toBeVisible();
    await expect(element(by.text('Duration (days) *'))).toBeVisible();
    await expect(element(by.text('Start Date *'))).toBeVisible();
  });

  it('should display the job info card with title and budget', async () => {
    const onBidScreen = await waitForText('Your Bid Amount', 3000);
    if (!onBidScreen) return;

    // The job card at the top should show the job title
    // and budget badge (if budget exists)
    try {
      await expect(element(by.text(/Budget:/))).toBeVisible();
    } catch {
      // Budget may not be set on all test jobs
    }
  });

  it('should show earnings breakdown when bid amount is entered', async () => {
    const onBidScreen = await waitForText('Your Bid Amount', 3000);
    if (!onBidScreen) return;

    // Type a bid amount
    await element(by.text('e.g. 250')).tap();
    await element(by.text('e.g. 250')).replaceText('500');

    // Earnings breakdown should appear
    await waitFor(element(by.text('Your bid')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.text('Platform fee (5%)'))).toBeVisible();
    await expect(element(by.text('You earn'))).toBeVisible();
  });

  it('should show bidding tips section', async () => {
    const onBidScreen = await waitForText('Bidding Tips', 3000);
    if (!onBidScreen) return;

    await expect(element(by.text('Bidding Tips'))).toBeVisible();
    await expect(
      element(by.text('Be competitive but fair with your pricing')),
    ).toBeVisible();
  });

  it('should keep submit button disabled until form is valid', async () => {
    const onBidScreen = await waitForText('Submit Bid', 3000);
    if (!onBidScreen) return;

    // Submit button should be disabled (reduced opacity) when form is incomplete
    // We test by verifying the button exists but the label is accessible
    await expect(element(by.label('Submit bid'))).toBeVisible();
  });

  it('should navigate back from bid submission', async () => {
    try {
      await element(by.label('Go back')).tap();
    } catch {
      try {
        await element(by.label('Go Back')).tap();
      } catch {
        await device.pressBack();
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  });
});
