const { test, expect } = require('@playwright/test');

test('Debug registration form submission', async ({ page }) => {
  console.log('🚀 Starting debug registration test...');
  
  // Listen to console logs
  page.on('console', msg => {
    console.log(`📝 Console ${msg.type()}: ${msg.text()}`);
  });
  
  // Listen to network responses
  page.on('response', async response => {
    if (response.url().includes('/api/auth/register')) {
      console.log(`🌐 API Response: ${response.status()} ${response.statusText()}`);
    }
    // Log any JavaScript files that fail to load or have errors
    if (response.url().includes('.js') && !response.ok()) {
      console.log(`⚠️ Failed JS: ${response.url()} - Status: ${response.status()}`);
    }
  });
  
  // Listen to page errors
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  });
  
  // Listen to request failures
  page.on('requestfailed', request => {
    console.log(`❌ Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  // Navigate to registration page
  await page.goto('http://localhost:3000/register');
  console.log('✅ Navigated to registration page');
  
  // Wait for page to load
  await expect(page).toHaveTitle(/Mintenance/);
  console.log('✅ Page title verified');
  
  // Wait for React hydration
  await page.waitForSelector('#firstName', { state: 'attached' });
  console.log('✅ Form fields attached to DOM');
  
  // Wait for cookie banner to appear and dismiss it
  try {
    console.log('⏳ Waiting for cookie banner...');
    const cookieBanner = page.locator('button:has-text("Accept All")');
    await cookieBanner.waitFor({ timeout: 5000 });
    console.log('✅ Cookie banner appeared');
    await cookieBanner.click();
    console.log('✅ Cookie banner dismissed');
    await page.waitForTimeout(500); // Wait for banner to fully disappear
  } catch (e) {
    console.log('⚠️ No cookie banner found or already dismissed');
  }
  
  // Wait a bit more to ensure React is fully hydrated
  await page.waitForTimeout(1000);
  console.log('✅ Waited for hydration');
  
  // Check if React actually loaded
  const hasReact = await page.evaluate(() => {
    return typeof window.React !== 'undefined' || document.querySelector('[data-reactroot]') !== null;
  });
  console.log(`🔍 React loaded: ${hasReact}`);
  
  // Check script tags
  const scripts = await page.evaluate(() => {
    const scriptTags = Array.from(document.querySelectorAll('script[src]'));
    return scriptTags.map(s => ({
      src: s.src,
      async: s.async,
      defer: s.defer
    }));
  });
  console.log(`📜 Script tags found: ${scripts.length}`);
  if (scripts.length > 0) {
    console.log(`   First script: ${scripts[0].src}`)
;
  }
  
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
  
  // Check the form element
  const form = page.locator('form');
  const formCount = await form.count();
  console.log(`📋 Forms found: ${formCount}`);
  
  // Check if form has onSubmit handler in React
  const hasOnSubmit = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return false;
    // Check if React has attached event listeners
    const reactProps = Object.keys(form).find(key => key.startsWith('__reactProps'));
    console.log('React props key:', reactProps);
    return !!reactProps;
  });
  console.log(`📋 Form has React handlers: ${hasOnSubmit}`);
  
  // Check if submit button is enabled
  const submitButton = page.locator('button[type="submit"]');
  const isEnabled = await submitButton.isEnabled();
  console.log(`📤 Submit button enabled: ${isEnabled}`);
  
  if (!isEnabled) {
    console.log('❌ Submit button is disabled - checking why...');
    
    // Check for required fields
    const requiredFields = page.locator('input[required]');
    const requiredCount = await requiredFields.count();
    console.log(`📝 Required fields found: ${requiredCount}`);
    
    for (let i = 0; i < requiredCount; i++) {
      const field = requiredFields.nth(i);
      const value = await field.inputValue();
      const id = await field.getAttribute('id');
      console.log(`  - ${id}: "${value}"`);
    }
  }
  
  // Submit the form
  console.log('📤 Submitting form...');
  await submitButton.click();
  
  // Wait for response
  await page.waitForTimeout(5000);
  
  // Check for error messages on the page
  const errorMessage = page.locator('[class*="error"], [class*="red"], .text-red-500, .text-red-600, .text-red-700');
  const errorCount = await errorMessage.count();
  
  if (errorCount > 0) {
    console.log(`❌ Found ${errorCount} error messages:`);
    for (let i = 0; i < errorCount; i++) {
      const errorText = await errorMessage.nth(i).textContent();
      console.log(`  - ${errorText}`);
    }
  } else {
    console.log('✅ No error messages found on page');
  }
  
  // Check for success messages
  const successMessage = page.locator('[class*="success"], [class*="green"], .text-green-500, .text-green-600, .text-green-700');
  const successCount = await successMessage.count();
  
  if (successCount > 0) {
    console.log(`✅ Found ${successCount} success messages:`);
    for (let i = 0; i < successCount; i++) {
      const successText = await successMessage.nth(i).textContent();
      console.log(`  - ${successText}`);
    }
  }
  
  // Check current URL
  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);
  
  if (currentUrl.includes('/dashboard')) {
    console.log('✅ Successfully redirected to dashboard!');
  } else if (currentUrl.includes('/login')) {
    console.log('⚠️ Redirected to login page');
  } else if (currentUrl.includes('/register')) {
    console.log('⚠️ Still on registration page');
    
    // Check if there are any validation errors
    const validationErrors = page.locator('text=required, text=invalid, text=minimum, text=maximum');
    const validationCount = await validationErrors.count();
    
    if (validationCount > 0) {
      console.log(`❌ Found ${validationCount} validation errors:`);
      for (let i = 0; i < validationCount; i++) {
        const validationText = await validationErrors.nth(i).textContent();
        console.log(`  - ${validationText}`);
      }
    }
  }
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'debug-registration-result.png' });
  console.log('📸 Screenshot saved as debug-registration-result.png');
});
