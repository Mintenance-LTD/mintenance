import { loginAsHomeowner, loginAsContractor, TEST_HOMEOWNER } from './helpers';

describe('Authentication', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show the login screen on fresh launch', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
  });

  it('should show error on invalid credentials', async () => {
    await element(by.id('email-input')).typeText('wrong@example.com');
    await element(by.id('password-input')).typeText('badpassword');
    await element(by.id('password-input')).tapReturnKey();

    try {
      await element(by.text('Sign In')).tap();
    } catch {
      await element(by.text('Log In')).tap();
    }

    // Should show an error banner
    await waitFor(element(by.id('login-error-banner')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should login as homeowner successfully', async () => {
    await loginAsHomeowner();
    // Verify we landed on the home screen
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should login as contractor successfully', async () => {
    await loginAsContractor();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should navigate to forgot password screen', async () => {
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(5000);

    try {
      await element(by.text('Forgot Password?')).tap();
    } catch {
      await element(by.text('Forgot password?')).tap();
    }

    await waitFor(element(by.text('Reset Password')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
