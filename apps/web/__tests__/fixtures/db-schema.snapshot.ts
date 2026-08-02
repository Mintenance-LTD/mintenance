/**
 * GENERATED schema snapshot — DO NOT hand-edit column lists.
 *
 * Column names for the tables referenced by EMBEDDED Supabase selects
 * (`alias:table!fk(col,col)`). Used by supabase-select-schema.test.ts to
 * fail the build when a select names a column that does not exist.
 *
 * Why this exists: PostgREST rejects the ENTIRE select when one embedded
 * column is unknown, so a single typo takes down a whole endpoint rather
 * than degrading one field. That shipped to production twice:
 *   - jobs → `properties!property_id(id,address_line1,city)`: properties
 *     has `address`, not `address_line1`. Every job list on web and mobile
 *     returned "Database operation failed" / 0 jobs while the DB held 21.
 *   - profiles → `date_of_birth,address_line1,address_line2,postal_code`
 *     in DBSCheckService: none of those columns exist.
 * Neither was caught because the unit tests mock the Supabase client, so
 * select strings are never executed against a real schema.
 *
 * Generated from the LIVE schema (project ukrjudtlvapiajkjbcrd) on
 * 2026-08-02 via the Supabase MCP. REGENERATE after any migration that
 * touches these tables:
 *
 *   SELECT table_name, string_agg(column_name, ',' ORDER BY column_name)
 *   FROM information_schema.columns
 *   WHERE table_schema='public' AND table_name IN (...)
 *   GROUP BY table_name ORDER BY table_name;
 *
 * If the test reports an unknown TABLE, add it here from the same query —
 * do not delete the assertion.
 */

export const DB_SCHEMA_SNAPSHOT: Readonly<Record<string, readonly string[]>> = {
  appointments:
    'appointment_date,cancellation_reason,cancelled_at,client_email,client_id,client_name,client_phone,completed_at,contractor_id,created_at,description,duration_minutes,end_time,id,job_id,location_address,location_type,notes,reminder_sent,reminder_sent_at,start_time,status,title,updated_at,video_call_url'.split(
      ','
    ),
  contractor_quotes:
    'accepted_at,client_address,client_email,client_name,client_phone,contractor_id,created_at,description,id,job_id,line_items,notes,quote_date,quote_number,sent_at,status,subtotal,tax_amount,tax_rate,template_id,terms,title,total_amount,updated_at,valid_until,viewed_at'.split(
      ','
    ),
  escrow_transactions:
    'admin_approved_at,admin_hold_at,admin_hold_by,admin_hold_reason,admin_hold_status,amount,auto_approval_date,auto_release_date,auto_release_enabled,before_after_comparison_score,contractor_payout,cooling_off_ends_at,created_at,currency,description,dispute_priority,dispute_window_ends_at,escalation_level,fee_hold_reason,fee_transfer_id,fee_transfer_status,fee_transferred_at,geolocation_verified,homeowner_approval,homeowner_approval_at,homeowner_inspection_at,homeowner_inspection_completed,id,job_id,mediation_completed_at,mediation_mediator_id,mediation_outcome,mediation_requested,mediation_requested_at,mediation_requested_by,mediation_scheduled_at,mediation_status,metadata,payee_id,payer_id,payment_intent_id,payment_type,photo_quality_passed,photo_verification_score,photo_verification_status,platform_fee,reconciliation_id,refunded_at,release_blocked_reason,release_reason,released_at,risk_hold_extended,risk_hold_reason,sla_deadline,status,stripe_charge_id,stripe_checkout_session_id,stripe_processing_fee,timestamp_verified,transfer_attempted_at,transfer_id,trust_score,updated_at'.split(
      ','
    ),
  jobs: 'access_info,archived_at,assigned_at,budget,budget_max,budget_min,category,city,completed_at,completion_confirmed_at,completion_confirmed_by_homeowner,contractor_id,created_at,deleted_at,description,embedding,embedding_model,embedding_updated_at,end_date,flexible_timeline,homeowner_id,id,image_analysis_metadata,is_rental_property,latitude,location,longitude,payer_user_id,payment_status,photos,postcode,priority,property_id,require_itemized_bids,required_skills,requirements,scheduled_duration_hours,scheduled_end_date,scheduled_start_date,serious_buyer_score,show_budget_to_contractors,start_date,started_at,status,subcategory,tenancy_metadata,title,updated_at,urgency'.split(
    ','
  ),
  profiles:
    'activated_at,address,admin_verified,avatar_url,background_check_status,bio,business_address,city,company_name,country,cover_photo_url,created_at,dbs_expiry,deleted_at,email,first_name,hourly_rate,id,insurance_expiry,insurance_expiry_date,intro_swiper_dismissed_at,is_available,is_visible_on_map,last_name,latitude,license_expiry,license_number,license_type,location,longitude,notification_preferences,onboarding_completed,onboarding_completed_at,phone,phone_verified,phone_verified_at,portfolio_images,postcode,profile_image_url,profile_photo_is_selfie,rating,role,settings,skills,stripe_charges_enabled,stripe_connect_account_id,stripe_customer_id,stripe_details_submitted,stripe_onboarding_completed_at,stripe_payouts_enabled,stripe_requirements_pending,stripe_transfers_active,subscription_status,tokens_revoked_at,total_jobs_completed,totp_secret_needs_rotation,trial_ends_at,trial_started_at,updated_at,verification_status,verified,years_experience'.split(
      ','
    ),
  properties:
    'access_mode,access_notes,address,bathrooms,bedrooms,city,consumer_unit_location,country,created_at,gas_isolator_location,id,is_primary,key_safe_code,latitude,longitude,org_id,owner_id,photos,postcode,property_name,property_type,square_footage,stopcock_location,updated_at,year_built'.split(
      ','
    ),
  reviews:
    'comment,created_at,id,job_id,rating,response,response_at,response_blocked_by_admin,response_published_at,reviewee_id,reviewer_id,would_recommend'.split(
      ','
    ),
} as const;
