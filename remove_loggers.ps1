$files = @(
  "packages/api-services/src/webhooks/WebhookService.ts",
  "packages/api-services/src/webhooks/WebhookController.ts",
  "packages/api-services/src/webhooks/handlers/StripeWebhookHandler.ts",
  "packages/api-services/src/webhooks/handlers/stripe/SubscriptionHandler.ts",
  "packages/api-services/src/webhooks/handlers/stripe/PaymentIntentHandler.ts",
  "packages/api-services/src/users/UserSettingsController.ts",
  "packages/api-services/src/users/UserService.ts",
  "packages/api-services/src/users/UserRepository.ts",
  "packages/api-services/src/users/UserProfileController.ts",
  "packages/api-services/src/users/UserAvatarController.ts",
  "packages/api-services/src/payments/RefundService.ts",
  "packages/api-services/src/payments/PaymentService.ts",
  "packages/api-services/src/payments/EscrowService.ts",
  "packages/api-services/src/jobs/JobStatusService.ts",
  "packages/api-services/src/jobs/JobService.ts",
  "packages/api-services/src/jobs/JobRepository.ts",
  "packages/api-services/src/jobs/JobDetailsService.ts",
  "packages/api-services/src/bids/BidService.ts"
)

foreach ($file in $files) {
    Write-Host "Processing $file"
    $path = Join-Path (Get-Location) $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        # Remove the conflicting logger definition
        # Matches: // Temporary logger (optional) + const logger = { ... };
        $newContent = $content -replace "(?ms)(\/\/ Temporary logger\s*)?const logger = \{.*?^\};", ""
        Set-Content -Path $path -Value $newContent -NoNewline
    } else {
        Write-Host "File not found: $path"
    }
}
