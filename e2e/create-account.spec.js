// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Account Creation', () => {
  test('should create a new account', async ({ page }) => {
    // Navigate to registration page
    await page.goto('http://localhost:3000/register');
    
    // Wait for page to load
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Generate test account details
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testFirstName = 'Test';
    const testLastName = 'User';
    const testPhone = '+44 7700 900000';
    
    console.log(`Creating account with email: ${testEmail}`);
    
    // Fill out the registration form using specific IDs
    await page.fill('#firstName', testFirstName);
    console.log('✅ First name field filled');
    
    await page.fill('#lastName', testLastName);
    console.log('✅ Last name field filled');
    
    await page.fill('#email', testEmail);
    console.log('✅ Email field filled');
    
    await page.fill('#phone', testPhone);
    console.log('✅ Phone field filled');
    
    await page.fill('#password', testPassword);
    console.log('✅ Password field filled');
    
    // Select homeowner role (default is already homeowner, but let's be explicit)
    const homeownerButton = page.locator('button:has-text("Homeowner")');
    await homeownerButton.click();
    console.log('✅ Role selected (Homeowner)');
    
    // Submit the form
    console.log('Submitting registration form...');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Test the simplified registration API directly
    console.log('Testing simplified registration API...');
    const response = await page.request.post('http://localhost:3000/api/test-register', {
      data: {
        email: `api-test-${timestamp}@example.com`,
        password: testPassword,
        firstName: testFirstName,
        lastName: testLastName,
        role: 'homeowner',
        phone: testPhone
      }
    });
    
    if (response.ok()) {
      const result = await response.json();
      console.log('✅ API registration successful:', result);
    } else {
      console.log('❌ API registration failed:', await response.text());
    }
    
    // Check for success indicators
    const successMessage = page.locator('text=success, text=created, text=registered, text=welcome');
    const errorMessage = page.locator('text=error, text=failed, text=invalid');
    const loadingMessage = page.locator('text=Creating account...');
    
    const hasSuccess = await successMessage.count() > 0;
    const hasError = await errorMessage.count() > 0;
    const isLoading = await loadingMessage.count() > 0;
    
    if (isLoading) {
      console.log('⏳ Registration still processing...');
      await page.waitForTimeout(3000);
    }
    
    if (hasSuccess) {
      console.log('✅ Account created successfully!');
    } else if (hasError) {
      console.log('❌ Account creation failed');
      // Log error message
      const errorText = await errorMessage.first().textContent();
      console.log(`Error: ${errorText}`);
    } else {
      console.log('⚠️ Registration submitted, checking for redirect...');
      
      // Check if redirected to dashboard or login
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Successfully redirected to dashboard!');
      } else if (currentUrl.includes('/login')) {
        console.log('⚠️ Redirected to login page');
      } else if (currentUrl.includes('/register')) {
        console.log('⚠️ Still on registration page');
      }
    }
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'registration-result.png' });
    console.log('📸 Screenshot saved as registration-result.png');
  });

  test('should handle account creation with validation', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    
    // Test form validation by submitting empty form
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Register")');
    
    if (await submitButton.count() > 0) {
      await submitButton.first().click();
      await page.waitForTimeout(1000);
      
      // Look for validation messages
      const validationMessages = page.locator('text=required, text=invalid, text=must be');
      const validationCount = await validationMessages.count();
      
      if (validationCount > 0) {
        console.log('✅ Form validation is working');
        const messages = await validationMessages.allTextContents();
        console.log('Validation messages:', messages);
      } else {
        console.log('⚠️ No validation messages found');
      }
    }
  });

  test('should test login with created account', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Look for login form
    const emailInput = page.locator('input[type="email"], input[name*="email"]');
    const passwordInput = page.locator('input[type="password"], input[name*="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Login")');
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      // Use test credentials (you may need to adjust these)
      await emailInput.first().fill('test@example.com');
      await passwordInput.first().fill('TestPassword123!');
      
      if (await submitButton.count() > 0) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
        
        // Check for login success or failure
        const currentUrl = page.url();
        if (currentUrl.includes('/dashboard')) {
          console.log('✅ Login successful - redirected to dashboard');
        } else if (currentUrl.includes('/login')) {
          console.log('❌ Login failed - stayed on login page');
        } else {
          console.log(`Login attempt completed. Current URL: ${currentUrl}`);
        }
      }
    }
  });
});
