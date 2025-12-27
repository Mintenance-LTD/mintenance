# Pending Supabase Migrations

**Generated:** December 22, 2025  
**Total Local Migrations:** 141  
**Total Applied Migrations:** 54  
**Pending Migrations:** 127

## ⚠️ Important Notes

1. **Duplicate Version Numbers**: Some migrations share the same version number, which could cause conflicts:
   - `20251202000001_add_mfa_support.sql` and `20251202000001_add_ground_truth_feedback.sql` (both: `20251202000001`)
   - `20251220000001_add_retraining_orchestration_tables.sql`, `20251220000001_add_video_assessment_tables.sql`, and `20251220000001_fix_building_assessments_rls_for_contractors.sql` (all: `20251220000001`)
   - `20250201000001_add_notification_agent_tables.sql` and `20250201000001_add_subscription_system.sql` (both: `20250201000001`)
   - `20250201000002_add_escrow_release_agent_tables.sql` and `20250201000002_subscription_functions.sql` (both: `20250201000002`)
   - `20250228000007_guarantee_program.sql` and `20250228000007_phone_verification_codes_table.sql` (both: `20250228000007`)
   - `20250301000001_add_free_tier.sql` and `20250301000001_skill_test_system.sql` (both: `20250301000001`)
   - `20250301000002_add_titans_and_learned_features.sql` and `20250301000002_log_ab_feedback_function.sql` (both: `20250301000002`)
   - `20250301000003_add_ab_test_tables.sql` and `20250301000003_titans_effectiveness_reports.sql` (both: `20250301000003`)
   - `20250301000004_add_yolo_models_table.sql` and `20250301000004_feature_usage_tracking.sql` (both: `20250301000004`)

2. **Short Version Formats**: Some migrations use shorter date formats (e.g., `20241220` instead of `20241220000000`), which may not match Supabase's expected format.

## Pending Migrations List

### December 2024
- `20241220_add_conformal_prediction_routing.sql`
- `20241220_add_presence_detection_fields.sql`

### January 2025
- `20250113000001_add_contractor_tables.sql`
- `20250113000002_create_contractor_certifications.sql`
- `20250114000001_rls_policy_improvements.sql`
- `20250115000001_add_fee_transfer_fields.sql`
- `20250115000002_rls_policy_hardening.sql`
- `20250115000003_enhanced_refresh_token_cleanup.sql`
- `20250116000001_enhanced_escrow_system.sql`
- `20250120000000_add_admin_verified_to_users.sql`
- `20250120000003_create_properties_table.sql`
- `20250120000004_create_user_preferences_table.sql`
- `20250129000001_add_message_reactions.sql`
- `20250130000001_add_idempotency_keys_table.sql`
- `20250131000000_ab_alerts_table.sql`
- `20250131000001_add_user_profile_fields.sql`
- `20250131000002_add_job_views_tracking.sql`
- `20250131000003_add_contractor_select_job_views.sql`
- `20250131000004_add_saved_jobs_table.sql`
- `20250131000013_add_automation_preferences.sql`
- `20250131000014_add_continuum_memory.sql`
- `20250131000015_add_nested_learning_tables.sql`
- `20250131000016_add_building_surveyor_learning.sql`

### February 2025
- `20250201000001_add_notification_agent_tables.sql` ⚠️ (duplicate version)
- `20250201000001_add_subscription_system.sql` ⚠️ (duplicate version)
- `20250201000002_add_escrow_release_agent_tables.sql` ⚠️ (duplicate version)
- `20250201000002_subscription_functions.sql` ⚠️ (duplicate version)
- `20250201000003_add_pricing_agent_tables.sql`
- `20250201000004_add_building_surveyor_tables.sql`
- `20250202120000_add_search_analytics.sql`
- `20250202120100_add_vector_search_support.sql`
- `20250202120200_add_notification_engagement_tracking.sql`
- `20250202120300_add_job_status_transitions.sql`
- `20250202120400_add_comprehensive_performance_indexes.sql`
- `20250212090000_add_auto_validation_metrics.sql`
- `20250212090500_create_ml_metrics.sql`
- `20250213000001_add_search_analytics_fallback_tracking.sql`
- `20250215000003_add_is_visible_on_map_to_users.sql`
- `20250216000001_add_skill_icon_to_contractor_skills.sql`
- `20250220000001_add_required_skills_to_jobs.sql`
- `20250220000002_add_contractor_post_likes.sql`
- `20250221000001_add_social_notification_triggers.sql`
- `20250225000001_link_bids_to_quotes.sql`
- `20250225000002_add_onboarding_tracking.sql`
- `20250226000001_add_verification_history.sql`
- `20250228000000_combined_platform_enhancements.sql`
- `20250228000001_admin_features.sql`
- `20250228000002_phone_verification.sql`
- `20250228000003_serious_buyer_score.sql`
- `20250228000004_background_check.sql`
- `20250228000005_skills_verification.sql`
- `20250228000006_portfolio_verification.sql`
- `20250228000007_guarantee_program.sql` ⚠️ (duplicate version)
- `20250228000007_phone_verification_codes_table.sql` ⚠️ (duplicate version)
- `20250228000008_payout_tiers.sql`
- `20250228000009_dispute_workflow.sql`
- `20250228000010_mediation.sql`
- `20250228000011_fix_bid_acceptance_race_condition.sql`
- `20250228000012_add_help_article_views.sql`
- `20250229000001_ab_test_schema.sql`
- `20250229000002_ab_test_verification.sql`
- `20250229000003_ab_critic_models.sql`

### March 2025
- `20250301000001_add_free_tier.sql` ⚠️ (duplicate version)
- `20250301000001_skill_test_system.sql` ⚠️ (duplicate version)
- `20250301000002_add_titans_and_learned_features.sql` ⚠️ (duplicate version)
- `20250301000002_log_ab_feedback_function.sql` ⚠️ (duplicate version)
- `20250301000003_add_ab_test_tables.sql` ⚠️ (duplicate version)
- `20250301000003_titans_effectiveness_reports.sql` ⚠️ (duplicate version)
- `20250301000004_add_yolo_models_table.sql` ⚠️ (duplicate version)
- `20250301000004_feature_usage_tracking.sql` ⚠️ (duplicate version)
- `20250301000005_add_yolo_corrections_table.sql`
- `20250301000006_add_yolo_retraining_jobs_table.sql`

### October 2025
- `20251022000001_add_atomic_token_rotation.sql`
- `20251022000002_add_token_family_tracking.sql`
- `20251027_escrow_payments.sql`
- `20251028_linkedin_parity_articles.sql`
- `20251028_linkedin_parity_companies.sql`
- `20251028_linkedin_parity_groups.sql`

### November 2025
- `20251102172710_add_contracts_table.sql`
- `20251102172711_add_location_tracking.sql`
- `20251102172712_add_job_scheduling_fields.sql`
- `20251103140045_add_company_info_to_contracts.sql`
- `20251105180327_add_image_analysis_metadata.sql`
- `20251110130438_add_dashboard_performance_indexes.sql`
- `20251111193600_fix_calculate_mrr_nested_aggregates.sql`
- `20251121000001_create_job_attachments_bucket.sql`

### December 2025
- `20251201000001_add_fnr_tracking.sql`
- `20251202000001_add_ground_truth_feedback.sql` ⚠️ (duplicate version)
- `20251202000001_add_mfa_support.sql` ⚠️ (duplicate version)
- `20251202000002_add_fnr_confidence_tracking.sql` ⚠️ (duplicate version)
- `20251202000002_add_shadow_mode_fields.sql` ⚠️ (duplicate version)
- `20251202000003_create_training_images_bucket.sql` ⚠️ (duplicate version)
- `20251202000003_enhanced_payment_security.sql` ⚠️ (duplicate version)
- `20251202000004_allow_null_user_id_for_shadow_mode.sql`
- `20251203000001_add_sam3_knowledge_distillation_tables.sql`
- `20251203000002_add_hybrid_routing_system.sql`
- `20251203000003_add_appointments_and_availability.sql`
- `20251203000004_ensure_payments_table_visibility.sql`
- `20251203000005_database_optimization_fixes.sql`
- `20251204000001_add_job_tracking_tables.sql`
- `20251205000001_add_yolo_models_storage_bucket.sql`
- `20251205000002_add_storage_reference_to_yolo_models.sql`
- `20251206000001_add_model_ab_testing_tables.sql`
- `20251206000002_add_continuous_learning_tables.sql`
- `20251207000001_maintenance_ai_adaptation.sql`
- `20251208000001_create_messages_table.sql`
- `20251208000002_fix_escrow_table_naming.sql`
- `20251208000003_add_contractor_job_discovery_policy.sql`
- `20251209155413_add_advanced_bid_fields.sql`
- `20251209164532_secure_homeowner_completion_confirmation.sql`
- `20251213000001_add_contractor_verification_system.sql`
- `20251213000002_seed_personality_questions.sql`
- `20251213000003_budget_visibility_improvements.sql`
- `20251216000001_create_newsletter_subscriptions.sql`
- `20251216000002_add_ai_service_costs_table.sql`
- `20251217000001_add_hybrid_routing_tables.sql`
- `20251217000002_add_model_drift_detection_tables.sql`
- `20251217000003_create_yolo_models_metadata_table.sql`
- `20251217000004_add_user_agent_settings_table.sql`
- `20251217000005_fix_building_assessments_job_id.sql`
- `20251220000001_add_retraining_orchestration_tables.sql` ⚠️ (duplicate version)
- `20251220000001_add_video_assessment_tables.sql` ⚠️ (duplicate version)
- `20251220000001_fix_building_assessments_rls_for_contractors.sql` ⚠️ (duplicate version)
- `20251220_conformal_prediction_calibration.sql`
- `20251221000001_add_critical_rls_policies.sql`
- `20251221181018_add_rls_policies_critical_tables.sql`
- `20251222_add_security_events_table.sql`

## Recommendations

1. **Fix Duplicate Versions**: Rename migrations with duplicate version numbers to ensure unique timestamps before applying.
2. **Review Migration Order**: Ensure migrations are applied in chronological order to avoid dependency issues.
3. **Test in Staging**: Apply migrations to a staging environment first to identify any conflicts or errors.
4. **Backup Database**: Create a backup before applying migrations in production.

## How to Apply Migrations

You can apply migrations using the Supabase MCP tools:

```bash
# Apply a single migration
# Use mcp_supabase_apply_migration with the project_id, name, and SQL content
```

Or use the Supabase CLI:

```bash
supabase db push
```

