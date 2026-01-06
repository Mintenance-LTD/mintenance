# Duplicate Table Analysis

## Tables with Multiple Definitions

### 1. saved_jobs
- First: 20250131000004_add_saved_jobs_table.sql
- Second: 20251204000001_add_job_tracking_tables.sql
- Resolution: Use second version with 'notes' column

### 2. job_views
- Multiple definitions found
- Resolution: Consolidate with proper foreign keys

### 3. payments
- Multiple definitions with different columns
- Resolution: Merge all columns, ensure compatibility

### 4. security_events
- First: 20251222_add_security_events_table.sql
- Second: 20251222000000_add_security_events_table.sql
- Resolution: Use most complete version

### 5. yolo_models
- ML-related tables duplicated
- Resolution: Consolidate ML infrastructure

### 6. confidence_calibration_data
- ML metrics table duplicated
- Resolution: Single version for AI features

### 7. hybrid_routing_decisions
- Routing logic table duplicated
- Resolution: Consolidate routing infrastructure

### 8. job_guarantees
- Guarantee system duplicated
- Resolution: Single guarantee tracking system

