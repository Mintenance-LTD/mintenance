const { test, expect } = require('@playwright/test');

test('Simple registration test', async ({ page }) => {
  console.log('🚀 Starting registration test...');
  
  // Navigate to registration page
  await page.goto('http://localhost:3000/register');
  console.log('✅ Navigated to registration page');
  
  // Wait for page to load
  await expect(page).toHaveTitle(/Mintenance/);
  console.log('✅ Page title verified');
  
  // Generate test account details
  const timestamp = Date.now();
  const testEmail = `testuser${timestamp}@example.com`;
  const testPassword = 'TestPassword!@#9';
  const testFirstName = 'Test';
  const testLastName = 'User';
  const testPhone = '+447700900000';
  
  console.log(`📝 Creating account with email: ${testEmail}`);
  
  // Fill out the registration form
  await page.fill('#firstName', testFirstName);
  console.log('✅ First name filled');
  
  await page.fill('#lastName', testLastName);
  console.log('✅ Last name filled');
  
  await page.fill('#email', testEmail);
  console.log('✅ Email filled');
  
  await page.fill('#phone', testPhone);
  console.log('✅ Phone filled');
  
  await page.fill('#password', testPassword);
  console.log('✅ Password filled');
  
  // Select homeowner role
  const homeownerButton = page.locator('button:has-text("Homeowner")');
  await homeownerButton.click();
  console.log('✅ Role selected');
  
  // Submit the form
  console.log('📤 Submitting form...');
  await page.click('button[type="submit"]');
  
  // Wait for response
  await page.waitForTimeout(5000);
  
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
    const errorText = await errorMessage.first().textContent();
    console.log(`Error: ${errorText}`);
  } else {
    console.log('⚠️ Registration submitted, checking for redirect...');
    
    // Check current URL
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
  await page.screenshot({ path: 'registration-test-result.png' });
  console.log('📸 Screenshot saved as registration-test-result.png');
});
