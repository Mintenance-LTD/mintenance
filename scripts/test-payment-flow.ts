#!/usr/bin/env tsx
/**
 * Payment Flow Test Script
 *
 * Tests the complete payment infrastructure including:
 * - Supabase database connectivity
 * - Stripe API integration
 * - Escrow transaction creation
 * - Payment intent workflow
 *
 * Prerequisites:
 * - SUPABASE_SERVICE_ROLE_KEY in .env
 * - STRIPE_SECRET_KEY in .env
 * - Database migration applied (stripe_customer_id column)
 *
 * Usage: npm run test:payment
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Validate environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL in .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('   Get it from: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/api');
  process.exit(1);
}

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY in .env');
  console.error('   Get it from: https://dashboard.stripe.com/test/apikeys');
  process.exit(1);
}

// Initialize clients
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Test database schema and connectivity
 */
async function testDatabaseSchema() {
  console.log('\n1️⃣ Testing Supabase Database Schema\n');

  try {
    // Check escrow_transactions table exists
    const { data: escrowTable, error: escrowError } = await supabase
      .rpc('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'escrow_transactions');

    if (escrowError) {
      // Fallback: try to query the table directly
      const { error: queryError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .limit(1);

      if (queryError) {
        throw new Error(`escrow_transactions table not found: ${queryError.message}`);
      }
      console.log('✅ escrow_transactions table exists');
    } else {
      console.log('✅ escrow_transactions table verified');
      console.log('   Columns:', escrowTable?.map((c: any) => c.column_name).join(', '));
    }

    // Check users table has stripe_customer_id
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (usersError) {
      throw new Error(`users table error: ${usersError.message}`);
    }
    console.log('✅ users table accessible');

    // Try to query stripe_customer_id specifically
    const { data: stripeCheck, error: stripeError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .limit(1);

    if (stripeError) {
      console.warn('⚠️  stripe_customer_id column missing - run migration:');
      console.warn('   npx supabase db push');
    } else {
      console.log('✅ stripe_customer_id column exists');
    }

    return true;
  } catch (error) {
    console.error('❌ Database schema test failed:', error);
    throw error;
  }
}

/**
 * Test Stripe API connectivity
 */
async function testStripeConnection() {
  console.log('\n2️⃣ Testing Stripe API Connection\n');

  try {
    // Get account balance
    const balance = await stripe.balance.retrieve();
    console.log('✅ Stripe API connected');
    console.log(`   Available: $${balance.available[0]?.amount / 100 || 0}`);
    console.log(`   Pending: $${balance.pending[0]?.amount / 100 || 0}`);

    // List recent payment intents (limit 3)
    const intents = await stripe.paymentIntents.list({ limit: 3 });
    console.log(`   Recent payment intents: ${intents.data.length}`);

    return true;
  } catch (error) {
    console.error('❌ Stripe connection test failed:', error);
    throw error;
  }
}

/**
 * Test payment intent creation
 */
async function testPaymentIntentCreation() {
  console.log('\n3️⃣ Testing Payment Intent Creation\n');

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000, // $50.00
      currency: 'usd',
      description: 'MCP Verification Test - Payment Intent',
      metadata: {
        test: 'true',
        purpose: 'mcp_verification',
        timestamp: new Date().toISOString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ Payment intent created successfully');
    console.log(`   ID: ${paymentIntent.id}`);
    console.log(`   Amount: $${paymentIntent.amount / 100}`);
    console.log(`   Status: ${paymentIntent.status}`);
    console.log(`   Client Secret: ${paymentIntent.client_secret?.substring(0, 20)}...`);

    return paymentIntent;
  } catch (error) {
    console.error('❌ Payment intent creation failed:', error);
    throw error;
  }
}

/**
 * Test escrow transaction creation
 */
async function testEscrowTransaction(paymentIntentId: string) {
  console.log('\n4️⃣ Testing Escrow Transaction Creation\n');

  try {
    const testJobId = '00000000-0000-0000-0000-000000000000'; // Test UUID

    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert({
        job_id: testJobId,
        amount: 50.00,
        status: 'pending',
        payment_intent_id: paymentIntentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (escrowError) {
      throw new Error(`Escrow creation failed: ${escrowError.message}`);
    }

    console.log('✅ Escrow transaction created');
    console.log(`   ID: ${escrow.id}`);
    console.log(`   Amount: $${escrow.amount}`);
    console.log(`   Status: ${escrow.status}`);
    console.log(`   Payment Intent: ${escrow.payment_intent_id}`);

    return escrow;
  } catch (error) {
    console.error('❌ Escrow transaction creation failed:', error);
    throw error;
  }
}

/**
 * Test customer creation
 */
async function testCustomerCreation() {
  console.log('\n5️⃣ Testing Stripe Customer Creation\n');

  try {
    const customer = await stripe.customers.create({
      email: 'test@mintenance.app',
      name: 'Test User',
      metadata: {
        test: 'true',
        purpose: 'mcp_verification',
      },
    });

    console.log('✅ Customer created successfully');
    console.log(`   ID: ${customer.id}`);
    console.log(`   Email: ${customer.email}`);

    return customer;
  } catch (error) {
    console.error('❌ Customer creation failed:', error);
    throw error;
  }
}

/**
 * Test payment method attachment
 */
async function testPaymentMethod(customerId: string) {
  console.log('\n6️⃣ Testing Payment Method Attachment\n');

  try {
    // Create a test payment method using Stripe test card token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa', // Stripe test token
      },
    });

    // Attach to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    });

    console.log('✅ Payment method attached successfully');
    console.log(`   ID: ${paymentMethod.id}`);
    console.log(`   Type: ${paymentMethod.type}`);
    console.log(`   Card: ${paymentMethod.card?.brand} ending in ${paymentMethod.card?.last4}`);

    return paymentMethod;
  } catch (error) {
    console.error('❌ Payment method attachment failed:', error);
    throw error;
  }
}

/**
 * Clean up test data
 */
async function cleanup(
  paymentIntent: Stripe.PaymentIntent | null,
  escrow: any | null,
  customer: Stripe.Customer | null
) {
  console.log('\n7️⃣ Cleaning Up Test Data\n');

  try {
    // Cancel payment intent
    if (paymentIntent) {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      console.log(`✅ Cancelled payment intent: ${paymentIntent.id}`);
    }

    // Delete escrow transaction
    if (escrow) {
      await supabase.from('escrow_transactions').delete().eq('id', escrow.id);
      console.log(`✅ Deleted escrow transaction: ${escrow.id}`);
    }

    // Delete customer
    if (customer) {
      await stripe.customers.del(customer.id);
      console.log(`✅ Deleted customer: ${customer.id}`);
    }

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('⚠️  Cleanup warning:', error);
    // Don't throw - cleanup errors are non-fatal
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Payment Flow Test Suite');
  console.log('==========================\n');

  let paymentIntent: Stripe.PaymentIntent | null = null;
  let escrow: any | null = null;
  let customer: Stripe.Customer | null = null;

  try {
    // Run all tests
    await testDatabaseSchema();
    await testStripeConnection();
    paymentIntent = await testPaymentIntentCreation();
    escrow = await testEscrowTransaction(paymentIntent.id);
    customer = await testCustomerCreation();
    await testPaymentMethod(customer.id);

    // Success
    console.log('\n✅ All Tests Passed!');
    console.log('====================\n');
    console.log('Your payment infrastructure is working correctly.');
    console.log('You can now deploy the payment API endpoints to production.\n');

    return true;
  } catch (error) {
    console.error('\n❌ Test Suite Failed');
    console.error('===================\n');
    console.error('Error:', error instanceof Error ? error.message : error);
    console.error('\nPlease fix the errors above before deploying to production.\n');
    return false;
  } finally {
    // Always clean up
    await cleanup(paymentIntent, escrow, customer);
  }
}

// Run tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
