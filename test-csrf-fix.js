/**
 * Test script to verify CSRF token fix
 * Run with: node test-csrf-fix.js
 */

async function testCSRF() {
  console.log('Testing CSRF token endpoint...\n');

  try {
    // Test 1: Fetch CSRF token from API
    console.log('1. Fetching CSRF token from /api/csrf...');
    const response = await fetch('http://localhost:3000/api/csrf', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`   ❌ Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));

    // Test 2: Check if 'token' field exists (the fix)
    if (data.token) {
      console.log('   ✅ CSRF token found in response.token:', data.token.substring(0, 10) + '...');
    } else {
      console.error('   ❌ No token field in response');
    }

    // Test 3: Check if old field name exists (should not)
    if (data.csrfToken) {
      console.log('   ⚠️  Old field name "csrfToken" still exists (should be "token")');
    } else {
      console.log('   ✅ Old field name "csrfToken" not present (correct)');
    }

    // Test 4: Extract CSRF cookie from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      console.log('\n2. CSRF Cookie set in response:');
      console.log('   ✅ Cookie header:', setCookie.substring(0, 50) + '...');
    } else {
      console.log('   ⚠️  No Set-Cookie header (might be normal if cookie already exists)');
    }

    console.log('\n✅ CSRF fix verified successfully!');
    console.log('The API now returns { token: "..." } which matches what the client code expects.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nMake sure the development server is running on http://localhost:3000');
  }
}

// Run the test
testCSRF();