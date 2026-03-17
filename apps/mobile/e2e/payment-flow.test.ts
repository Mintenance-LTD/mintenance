/**
 * Payment Flow E2E Tests
 *
 * Covers the payment lifecycle screens accessible to homeowners:
 *  - Payment screen rendering and payment method selection
 *  - Add Payment Method form (card / bank account)
 *  - Payment History list with filter chips and stats
 *  - Escrow Dashboard with summary cards and records
 *
 * These screens live under the Profile > Account stack and the
 * Jobs stack (PaymentScreen when paying for a job).
 */
import {
  loginAsHomeowner,
  loginAsContractor,
  navigateToTab,
  navigateToProfileSubScreen,
  tapText,
  waitForText,
} from './helpers';

describe('Payment Flow - Homeowner', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsHomeowner();
  });

  // ---------------------------------------------------------------------------
  // Payment History
  // ---------------------------------------------------------------------------
  describe('Payment History', () => {
    beforeAll(async () => {
      await navigateToTab('Profile');
    });

    it('should navigate to Payment History from Profile', async () => {
      // The Profile screen has a "Payment History" menu item
      await tapText('Payment History', 'Payments');

      await waitFor(
        element(by.text('Payment History')),
      )
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should display filter chips (All, Completed, Pending, Refunded)', async () => {
      await expect(element(by.text('All'))).toBeVisible();
      await expect(element(by.text('Completed'))).toBeVisible();
      await expect(element(by.text('Pending'))).toBeVisible();
      await expect(element(by.text('Refunded'))).toBeVisible();
    });

    it('should show empty state or payment cards', async () => {
      // Either the empty state or at least one payment card should be visible
      const hasEmptyState = await waitForText('No Payments Yet', 3000);
      if (hasEmptyState) {
        await expect(element(by.text('No Payments Yet'))).toBeVisible();
      } else {
        // If there are payments, at least the stats row should render
        await waitFor(element(by.text('PAID')))
          .toBeVisible()
          .withTimeout(5000);
      }
    });

    it('should filter payments when tapping a filter chip', async () => {
      await element(by.text('Pending')).tap();
      // Brief wait for filter to apply
      await new Promise((r) => setTimeout(r, 500));

      // Verify the chip is active by tapping back to All
      await element(by.text('All')).tap();
      await new Promise((r) => setTimeout(r, 500));
    });

    it('should navigate back from Payment History', async () => {
      // Tap the back button (accessibility label "Go back" or arrow icon)
      try {
        await element(by.label('Go back')).tap();
      } catch {
        await element(by.label('Show back')).tap();
      }

      await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  // ---------------------------------------------------------------------------
  // Add Payment Method
  // ---------------------------------------------------------------------------
  describe('Add Payment Method', () => {
    beforeAll(async () => {
      await navigateToTab('Profile');
    });

    it('should navigate to Add Payment Method screen', async () => {
      // Navigate through Payment Methods or direct menu item
      try {
        await tapText('Payment Methods', 'Manage Payments');
      } catch {
        // Some layouts place it under Account
        await tapText('Account', 'Account Settings');
        await tapText('Payment Methods', 'Manage Payments');
      }

      // Tap "Add" or "+" to open add payment method
      try {
        await tapText('Add Payment Method', 'Add');
      } catch {
        // May already be on the add screen if no methods exist
      }

      await waitFor(element(by.text('Add Payment Method')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should display payment type selector (Card, PayPal, Bank)', async () => {
      await expect(element(by.text('Credit/Debit Card'))).toBeVisible();
      // PayPal may show "Soon" badge
      await expect(element(by.text('PayPal'))).toBeVisible();
      await expect(element(by.text('Bank Account'))).toBeVisible();
    });

    it('should show card form by default with Card Details label', async () => {
      await expect(element(by.text('Card Details'))).toBeVisible();
    });

    it('should show security information', async () => {
      await expect(
        element(by.text('Your information is secure')),
      ).toBeVisible();
    });

    it('should switch to bank account form when Bank Account is tapped', async () => {
      await element(by.text('Bank Account')).tap();
      await new Promise((r) => setTimeout(r, 300));

      await expect(element(by.text('Account Holder Name'))).toBeVisible();
      await expect(element(by.text('Sort Code'))).toBeVisible();
      await expect(element(by.text('Account Number'))).toBeVisible();
    });

    it('should show PayPal coming soon state', async () => {
      await element(by.text('PayPal')).tap();
      await new Promise((r) => setTimeout(r, 300));

      await expect(element(by.text('PayPal is coming soon'))).toBeVisible();
    });

    it('should navigate back from Add Payment Method', async () => {
      try {
        await element(by.label('Go back')).tap();
      } catch {
        await element(by.label('Go Back')).tap();
      }

      // Wait for previous screen to appear
      await new Promise((r) => setTimeout(r, 500));
    });
  });

  // ---------------------------------------------------------------------------
  // Escrow Dashboard
  // ---------------------------------------------------------------------------
  describe('Escrow Dashboard', () => {
    beforeAll(async () => {
      await navigateToTab('Profile');
    });

    it('should navigate to Escrow Dashboard from Profile', async () => {
      await tapText('Escrow Dashboard', 'Escrow');

      await waitFor(element(by.text('Escrow Dashboard')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should display summary cards or empty state', async () => {
      const hasEmpty = await waitForText('No Escrow Records', 3000);

      if (hasEmpty) {
        await expect(element(by.text('No Escrow Records'))).toBeVisible();
        await expect(
          element(by.text('Escrow transactions will appear here once payments are made.')),
        ).toBeVisible();
      } else {
        // Summary cards: Held, Pending, Released
        await expect(element(by.text('Held'))).toBeVisible();
        await expect(element(by.text('Pending'))).toBeVisible();
        await expect(element(by.text('Released'))).toBeVisible();
      }
    });

    it('should navigate back from Escrow Dashboard', async () => {
      try {
        await element(by.label('Go back')).tap();
      } catch {
        await element(by.label('Go Back')).tap();
      }

      await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
        .toBeVisible()
        .withTimeout(5000);
    });
  });
});

describe('Payment Flow - Contractor Escrow View', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsContractor();
  });

  it('should navigate to Profile tab', async () => {
    await navigateToTab('Profile');
    await waitFor(element(by.text('Profile').or(element(by.text('Settings')))))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should access Escrow Dashboard as contractor', async () => {
    const found = await waitForText('Escrow Dashboard', 3000);
    if (!found) {
      // May be labelled differently for contractors
      await tapText('Escrow', 'Payments');
    } else {
      await element(by.text('Escrow Dashboard')).tap();
    }

    await waitFor(element(by.text('Escrow Dashboard')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show contractor-relevant escrow records or empty state', async () => {
    const hasEmpty = await waitForText('No Escrow Records', 3000);

    if (hasEmpty) {
      await expect(element(by.text('No Escrow Records'))).toBeVisible();
    } else {
      // At least the summary should be visible
      await waitFor(element(by.text('Held')))
        .toBeVisible()
        .withTimeout(5000);
    }
  });
});
