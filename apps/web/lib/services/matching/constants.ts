/**
 * Shared matching constants (2026-07-17 PostGIS cutover).
 *
 * DEFAULT_MATCH_RADIUS_KM is the platform-wide fallback broadcast/search
 * radius used when a contractor has no active `service_areas` coverage
 * of their own (and as the discover feed's default map radius). It
 * replaces the hardcoded `25` literals that previously lived in
 * job-notification-service, the discover route, and the mobile
 * explore-map viewmodel. Contractors WITH active service areas are
 * matched on their own configured radius instead — see
 * `find_contractors_for_job` in migration 20260717120000.
 */
export const DEFAULT_MATCH_RADIUS_KM = 25;
