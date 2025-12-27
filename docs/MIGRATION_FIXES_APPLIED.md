# Migration Fixes Applied

**Date:** December 22, 2025  
**Status:** ✅ Duplicate versions fixed, ✅ Short formats fixed, ✅ First migration applied

## Completed Tasks

### 1. ✅ Fixed Duplicate Version Numbers

All duplicate migration versions have been renamed to unique timestamps:

#### December 2025 Duplicates Fixed:
- `20251202000001_add_ground_truth_feedback.sql` → Kept as `20251202000001`
- `20251202000001_add_mfa_support.sql` → Renamed to `20251202000002_add_mfa_support.sql`
- `20251202000002_add_fnr_confidence_tracking.sql` → Renamed to `20251202000003_add_fnr_confidence_tracking.sql`
- `20251202000002_add_shadow_mode_fields.sql` → Renamed to `20251202000005_add_shadow_mode_fields.sql`
- `20251202000003_create_training_images_bucket.sql` → Renamed to `20251202000006_create_training_images_bucket.sql`
- `20251202000003_enhanced_payment_security.sql` → Renamed to `20251202000007_enhanced_payment_security.sql`

#### December 2025 - Multiple Duplicates Fixed:
- `20251220000001_add_retraining_orchestration_tables.sql` → Kept as `20251220000001`
- `20251220000001_add_video_assessment_tables.sql` → Renamed to `20251220000002_add_video_assessment_tables.sql`
- `20251220000001_fix_building_assessments_rls_for_contractors.sql` → Renamed to `20251220000003_fix_building_assessments_rls_for_contractors.sql`

#### February 2025 Duplicates Fixed:
- `20250201000001_add_notification_agent_tables.sql` → Kept as `20250201000001`
- `20250201000001_add_subscription_system.sql` → Renamed to `20250201000004_add_subscription_system.sql`
- `20250201000002_add_escrow_release_agent_tables.sql` → Kept as `20250201000002`
- `20250201000002_subscription_functions.sql` → Renamed to `20250201000005_subscription_functions.sql`
- `20250228000007_guarantee_program.sql` → Kept as `20250228000007`
- `20250228000007_phone_verification_codes_table.sql` → Renamed to `20250228000009_phone_verification_codes_table.sql`
- Updated subsequent migrations to maintain order

#### March 2025 Duplicates Fixed:
- `20250301000001_add_free_tier.sql` → Kept as `20250301000001`
- `20250301000001_skill_test_system.sql` → Renamed to `20250301000006_skill_test_system.sql`
- `20250301000002_add_titans_and_learned_features.sql` → Kept as `20250301000002`
- `20250301000002_log_ab_feedback_function.sql` → Renamed to `20250301000007_log_ab_feedback_function.sql`
- `20250301000003_add_ab_test_tables.sql` → Kept as `20250301000003`
- `20250301000003_titans_effectiveness_reports.sql` → Renamed to `20250301000008_titans_effectiveness_reports.sql`
- `20250301000004_add_yolo_models_table.sql` → Kept as `20250301000004`
- `20250301000004_feature_usage_tracking.sql` → Renamed to `20250301000009_feature_usage_tracking.sql`
- `20250301000005_add_yolo_corrections_table.sql` → Kept as `20250301000005`
- `20250301000005_feature_usage_tracking.sql` → Renamed to `20250301000009_feature_usage_tracking.sql` (already handled)
- `20250301000006_add_yolo_retraining_jobs_table.sql` → Renamed to `20250301000010_add_yolo_retraining_jobs_table.sql`

### 2. ✅ Fixed Short Version Formats

All migrations with short date formats have been renamed to full timestamps:

- `20241220_add_conformal_prediction_routing.sql` → `20241220000000_add_conformal_prediction_routing.sql`
- `20241220_add_presence_detection_fields.sql` → `20241220000001_add_presence_detection_fields.sql`
- `20251027_escrow_payments.sql` → `20251027000000_escrow_payments.sql`
- `20251028_linkedin_parity_articles.sql` → `20251028000000_linkedin_parity_articles.sql`
- `20251028_linkedin_parity_companies.sql` → `20251028000001_linkedin_parity_companies.sql`
- `20251028_linkedin_parity_groups.sql` → `20251028000002_linkedin_parity_groups.sql`
- `20251220_conformal_prediction_calibration.sql` → `20251220000000_conformal_prediction_calibration.sql`
- `20251222_add_security_events_table.sql` → `20251222000000_add_security_events_table.sql`

### 3. ✅ Applied First Migration

Successfully applied the first pending migration:
- ✅ `20241220000000_add_conformal_prediction_routing.sql` - Added conformal prediction columns and views to `hybrid_routing_decisions` table

## Remaining Work

### 126 Migrations Still Pending

All migrations are now properly named with unique timestamps and ready to be applied chronologically.

### Recommended Approach

1. **Batch Application**: Apply migrations in batches of 10-20 to monitor for errors
2. **Dependency Checking**: Some migrations may depend on tables/columns created in earlier migrations
3. **Testing**: Test each batch in a staging environment before production
4. **Rollback Plan**: Have a rollback strategy for each batch

### Next Steps

To apply remaining migrations, use the Supabase MCP `apply_migration` tool:

```typescript
// Example for next migration
mcp_supabase_apply_migration({
  project_id: 'ukrjudtlvapiajkjbcrd',
  name: 'add_presence_detection_fields',
  query: '<SQL_CONTENT>'
})
```

Or use the script at `scripts/apply-pending-migrations.ts` (needs to be updated to use MCP tools).

## Files Created/Updated

1. ✅ `scripts/check-pending-migrations.ts` - Script to check pending migrations
2. ✅ `scripts/apply-pending-migrations.ts` - Template script for applying migrations
3. ✅ `docs/PENDING_MIGRATIONS.md` - List of all pending migrations
4. ✅ `docs/MIGRATION_FIXES_APPLIED.md` - This file

## Verification

Run the check script to verify all duplicates are fixed:

```bash
npx tsx scripts/check-pending-migrations.ts
```

All migrations should now have unique version numbers and be ready for chronological application.

