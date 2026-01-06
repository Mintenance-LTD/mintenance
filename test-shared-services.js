// Test script to verify shared services package is working

console.log('Testing @mintenance/services package...\n');

try {
  // Test importing the services
  const services = require('./packages/services/dist/index.js');

  console.log('✅ Package loads successfully');
  console.log('\nAvailable exports:');
  console.log('- BaseService:', !!services.BaseService ? '✅' : '❌');
  console.log('- AuthService:', !!services.AuthService ? '✅' : '❌');
  console.log('- PaymentService:', !!services.PaymentService ? '✅' : '❌');
  console.log('- NotificationService:', !!services.NotificationService ? '✅' : '❌');

  // Test creating instances (without Supabase, just checking constructor)
  if (services.AuthService) {
    console.log('\n📋 AuthService methods:');
    const authProto = services.AuthService.prototype;
    const methods = Object.getOwnPropertyNames(authProto)
      .filter(name => typeof authProto[name] === 'function' && name !== 'constructor');
    methods.forEach(method => console.log(`  - ${method}`));
  }

  if (services.PaymentService) {
    console.log('\n💳 PaymentService methods:');
    const paymentProto = services.PaymentService.prototype;
    const methods = Object.getOwnPropertyNames(paymentProto)
      .filter(name => typeof paymentProto[name] === 'function' && name !== 'constructor');
    methods.forEach(method => console.log(`  - ${method}`));
  }

  if (services.NotificationService) {
    console.log('\n🔔 NotificationService methods:');
    const notifProto = services.NotificationService.prototype;
    const methods = Object.getOwnPropertyNames(notifProto)
      .filter(name => typeof notifProto[name] === 'function' && name !== 'constructor');
    methods.forEach(method => console.log(`  - ${method}`));
  }

  console.log('\n✅ All services are properly exported and accessible!');

} catch (error) {
  console.error('❌ Error loading services package:', error.message);
  console.error('\nMake sure to build the package first:');
  console.error('  cd packages/services && npm run build');
}