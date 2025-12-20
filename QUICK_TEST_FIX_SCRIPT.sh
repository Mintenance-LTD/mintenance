#!/bin/bash

# Quick Test File Fix Script
# Automatically updates test files with correct service method names
# Run from project root: bash QUICK_TEST_FIX_SCRIPT.sh

echo "🔧 Starting automated test file fixes..."

cd apps/mobile

# Backup test files first
echo "📦 Creating backup..."
tar -czf test-files-backup-$(date +%Y%m%d-%H%M%S).tar.gz src/__tests__/

# PaymentService method updates
echo "💳 Fixing PaymentService method calls..."
find src/__tests__ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/PaymentService\.initializePayment/PaymentService.createPaymentIntent/g' \
  -e 's/PaymentService\.createJobPayment/PaymentService.createPaymentIntent/g' \
  -e 's/PaymentService\.createEscrowTransaction/PaymentService.createEscrowPayment/g' \
  -e 's/PaymentService\.holdPaymentInEscrow/PaymentService.createEscrowPayment/g' \
  -e 's/PaymentService\.confirmPayment(/PaymentService.confirmPaymentIntent(/g' \
  {} \;

# NotificationService method updates
echo "🔔 Fixing NotificationService method calls..."
find src/__tests__ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/NotificationService\.sendNotificationToUser/NotificationService.sendPushNotification/g' \
  -e 's/NotificationService\.sendNotificationToUsers/NotificationService.sendBulkNotification/g' \
  -e 's/NotificationService\.notifyPaymentReceived/NotificationService.sendPushNotification/g' \
  {} \;

# ContractorService method updates
echo "👷 Fixing ContractorService method calls..."
find src/__tests__ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/ContractorService\.getContractors(/ContractorService.findNearbyContractors(/g' \
  -e 's/ContractorService\.createMatch(/ContractorService.swipeContractor(/g' \
  {} \;

# MessagingService method updates
echo "💬 Fixing MessagingService method calls..."
find src/__tests__ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  -e 's/MessagingService\.createConversation/MessagingService.createThread/g' \
  -e 's/MessagingService\.getConversation/MessagingService.getConversations/g' \
  {} \;

# Remove backup files
echo "🧹 Cleaning up backup files..."
find src/__tests__ -name "*.bak" -delete

# Run type check to see remaining errors
echo "🔍 Running type check..."
npm run type-check 2>&1 | tee type-check-results.txt

# Count errors
ERROR_COUNT=$(grep -c "error TS" type-check-results.txt || echo "0")

echo ""
echo "✅ Automated fixes complete!"
echo "📊 Remaining TypeScript errors: $ERROR_COUNT"
echo ""
echo "Next steps:"
echo "1. Review type-check-results.txt for remaining errors"
echo "2. Manually fix mock definitions and type assertions"
echo "3. Run: npm test to validate tests still pass"
echo ""
echo "Backup saved in: test-files-backup-*.tar.gz"
