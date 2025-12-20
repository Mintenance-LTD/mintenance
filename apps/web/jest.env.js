// Set test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.STRIPE_SECRET_KEY = 'sk_test_test-key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test-webhook-secret';
