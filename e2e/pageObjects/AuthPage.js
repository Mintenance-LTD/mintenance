/**
 * Authentication Page Object Model
 * Handles sign in, sign up, and authentication flows
 */

class AuthPage {
  // Welcome screen elements
  get welcomeScreen() {
    return element(by.id('welcome-screen'));
  }
  get signInButton() {
    return element(by.id('sign-in-button'));
  }
  get signUpButton() {
    return element(by.id('sign-up-button'));
  }
  get skipButton() {
    return element(by.id('skip-button'));
  }

  // Sign in form elements
  get signInScreen() {
    return element(by.id('sign-in-screen'));
  }
  get emailInput() {
    return element(by.id('email-input'));
  }
  get passwordInput() {
    return element(by.id('password-input'));
  }
  get signInSubmitButton() {
    return element(by.id('sign-in-submit-button'));
  }
  get forgotPasswordLink() {
    return element(by.id('forgot-password-link'));
  }
  get showPasswordToggle() {
    return element(by.id('show-password-toggle'));
  }

  // Sign up form elements
  get signUpScreen() {
    return element(by.id('sign-up-screen'));
  }
  get firstNameInput() {
    return element(by.id('first-name-input'));
  }
  get lastNameInput() {
    return element(by.id('last-name-input'));
  }
  get confirmPasswordInput() {
    return element(by.id('confirm-password-input'));
  }
  get roleHomeowner() {
    return element(by.id('role-homeowner'));
  }
  get roleContractor() {
    return element(by.id('role-contractor'));
  }
  get createAccountButton() {
    return element(by.id('create-account-button'));
  }
  get termsCheckbox() {
    return element(by.id('terms-checkbox'));
  }
  get privacyPolicyLink() {
    return element(by.id('privacy-policy-link'));
  }

  // Common elements
  get backButton() {
    return element(by.id('back-button'));
  }
  get loadingSpinner() {
    return element(by.id('loading-spinner'));
  }
  get errorMessage() {
    return element(by.id('error-message'));
  }
  get successMessage() {
    return element(by.id('success-message'));
  }

  // Actions
  async waitForWelcomeScreen() {
    await waitFor(this.welcomeScreen).toBeVisible().withTimeout(10000);
  }

  async navigateToSignIn() {
    await this.signInButton.tap();
    await waitFor(this.signInScreen).toBeVisible().withTimeout(5000);
  }

  async navigateToSignUp() {
    await this.signUpButton.tap();
    await waitFor(this.signUpScreen).toBeVisible().withTimeout(5000);
  }

  async goBack() {
    await this.backButton.tap();
  }

  async signIn(email, password) {
    await this.navigateToSignIn();
    await this.fillSignInForm(email, password);
    await this.signInSubmitButton.tap();
    await this.waitForSignInComplete();
  }

  async signUp(userData) {
    await this.navigateToSignUp();
    await this.fillSignUpForm(userData);
    await this.createAccountButton.tap();
    await this.waitForSignUpComplete();
  }

  async fillSignInForm(email, password) {
    await this.emailInput.replaceText(email);
    await this.passwordInput.replaceText(password);
  }

  async fillSignUpForm(userData) {
    await this.emailInput.replaceText(userData.email);
    await this.passwordInput.replaceText(userData.password);
    await this.confirmPasswordInput.replaceText(userData.password);
    await this.firstNameInput.replaceText(userData.firstName);
    await this.lastNameInput.replaceText(userData.lastName);

    if (userData.role === 'homeowner') {
      await this.roleHomeowner.tap();
    } else if (userData.role === 'contractor') {
      await this.roleContractor.tap();
    }

    await this.termsCheckbox.tap();
  }

  async togglePasswordVisibility() {
    await this.showPasswordToggle.tap();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.tap();
  }

  // Wait methods
  async waitForSignInComplete() {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(15000);
  }

  async waitForSignUpComplete() {
    // Sign up might go to onboarding or home screen depending on user type
    try {
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(15000);
    } catch (error) {
      await waitFor(element(by.id('contractor-onboarding-screen')))
        .toBeVisible()
        .withTimeout(15000);
    }
  }

  async waitForLoading() {
    await waitFor(this.loadingSpinner).toBeVisible().withTimeout(5000);
    await waitFor(this.loadingSpinner).not.toBeVisible().withTimeout(10000);
  }

  // Verification methods
  async verifyWelcomeScreen() {
    await expect(this.welcomeScreen).toBeVisible();
    await expect(this.signInButton).toBeVisible();
    await expect(this.signUpButton).toBeVisible();
    await expect(element(by.text('Welcome to Mintenance'))).toBeVisible();
  }

  async verifySignInScreen() {
    await expect(this.signInScreen).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInSubmitButton).toBeVisible();
  }

  async verifySignUpScreen() {
    await expect(this.signUpScreen).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.roleHomeowner).toBeVisible();
    await expect(this.roleContractor).toBeVisible();
  }

  async verifyErrorMessage(expectedMessage) {
    await expect(this.errorMessage).toBeVisible();
    if (expectedMessage) {
      await expect(element(by.text(expectedMessage))).toBeVisible();
    }
  }

  async verifySuccessMessage(expectedMessage) {
    await expect(this.successMessage).toBeVisible();
    if (expectedMessage) {
      await expect(element(by.text(expectedMessage))).toBeVisible();
    }
  }

  // Form validation checks
  async verifyEmailValidation() {
    await this.emailInput.replaceText('invalid-email');
    await this.signInSubmitButton.tap();
    await this.verifyErrorMessage('Please enter a valid email address');
  }

  async verifyPasswordValidation() {
    await this.emailInput.replaceText('test@example.com');
    await this.passwordInput.replaceText('123'); // Too short
    await this.signInSubmitButton.tap();
    await this.verifyErrorMessage('Password must be at least 8 characters');
  }

  async verifyRequiredFields() {
    await this.signInSubmitButton.tap();
    await this.verifyErrorMessage('Please fill in all required fields');
  }

  // Social authentication (if implemented)
  async signInWithGoogle() {
    await element(by.id('google-sign-in')).tap();
    // Handle Google OAuth flow
  }

  async signInWithApple() {
    await element(by.id('apple-sign-in')).tap();
    // Handle Apple OAuth flow
  }

  // Utility methods
  async clearForm() {
    await this.emailInput.clearText();
    await this.passwordInput.clearText();
  }

  async takeScreenshot(name) {
    await device.takeScreenshot(`auth_${name}`);
  }
}

module.exports = AuthPage;
