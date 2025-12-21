# DOCUMENTATION ORGANIZATION PLAN
**Mintenance Platform - December 2025**

## EXECUTIVE SUMMARY

Found **407 markdown files** (excluding node_modules). Many are **duplicate**, **outdated**, or **completion reports** that should be archived. This plan organizes documentation into logical folders and identifies files for deletion.

**Current State**: Cluttered root directory with 200+ .md files
**Target State**: Organized docs/ structure with <30 root-level files

---

## RECOMMENDED FOLDER STRUCTURE

```
mintenance-clean/
├── README.md (keep in root)
├── CHANGELOG.md (keep in root)
├── SECURITY_REMEDIATION_PLAN.md (NEW, keep in root)
│
├── docs/
│   ├── business/                    # Business & Investor Documents
│   │   ├── MINTENANCE_BUSINESS_PLAN_2025.md
│   │   ├── STARTUP_COST_ESTIMATION_2025.md
│   │   ├── MINTENANCE_PLATFORM_OVERVIEW_2025.md
│   │   ├── INTELLECTUAL_PROPERTY_STRATEGY_2025.md
│   │   ├── MINTAI_EXECUTIVE_SUMMARY.md
│   │   ├── PLATFORM_FEATURE_COMPARISON_WEB_VS_MOBILE.md
│   │   ├── MARKET_RESEARCH.md
│   │   ├── MINTENANCE_MARKET_COMPARISON_REPORT.md
│   │   └── MARKET_REPORT_VERIFICATION.md
│   │
│   ├── technical/                   # Current Technical Documentation
│   │   ├── ai/                      # AI & ML Documentation
│   │   │   ├── AI_ALGORITHM_TECHNICAL_OVERVIEW.md
│   │   │   ├── AI_FLOWS_AND_USE_CASES.md
│   │   │   ├── HYBRID_INFERENCE_DELIVERABLES.md
│   │   │   ├── SAM3_PRESENCE_DETECTION_GUIDE.md
│   │   │   ├── LOCAL_YOLO_DEPLOYMENT_COMPLETE.md
│   │   │   ├── CONTINUOUS_LEARNING_GUIDE.md
│   │   │   └── HOW_TO_MONITOR_LEARNING.md
│   │   │
│   │   ├── api/                     # API Documentation
│   │   │   ├── API_DOCUMENTATION.md
│   │   │   ├── API_ENDPOINTS.md
│   │   │   ├── BACKEND_EMBEDDINGS_API.md
│   │   │   └── PAYMENT_API_DOCUMENTATION.md
│   │   │
│   │   ├── architecture/            # System Architecture
│   │   │   ├── MINTENANCE_TECH_STACK.md
│   │   │   ├── AUTH_ARCHITECTURE_EXPLAINED.md
│   │   │   ├── TECHNICAL_ARCHITECTURE.md
│   │   │   ├── ROUTING_STRUCTURE.md
│   │   │   └── DEPENDENCY_MANAGEMENT.md
│   │   │
│   │   ├── database/                # Database Documentation
│   │   │   ├── MIGRATION_GUIDE.md
│   │   │   ├── MANUAL_MIGRATION_INSTRUCTIONS.md
│   │   │   └── docs/PUSH_MIGRATIONS_TO_SUPABASE.md
│   │   │
│   │   ├── deployment/              # Deployment & DevOps
│   │   │   ├── DEPLOYMENT_GUIDE.md
│   │   │   ├── PRE_DEPLOYMENT_CHECKLIST.md
│   │   │   ├── QUICK_START_DEPLOYMENT.md
│   │   │   ├── MANUAL_VERCEL_DEPLOYMENT_GUIDE.md
│   │   │   ├── GITHUB_CI_CD_GUIDE.md
│   │   │   ├── REDIS_SETUP_GUIDE.md
│   │   │   └── docs/SAM3_DEPLOYMENT_RUNBOOK.md
│   │   │
│   │   ├── security/                # Security Documentation
│   │   │   ├── CRITICAL_SECURITY_FIXES.md
│   │   │   ├── SECURITY_FIXES_REPORT.md
│   │   │   ├── SECURITY_IMPLEMENTATION_SUMMARY.md
│   │   │   ├── apps/web/docs/CSRF_PROTECTION.md
│   │   │   ├── apps/web/docs/SSRF_PROTECTION.md
│   │   │   ├── apps/web/docs/SECURITY_RECOMMENDATIONS_IMPLEMENTED.md
│   │   │   └── apps/web/docs/SECURITY_VULNERABILITIES_FIXED.md
│   │   │
│   │   ├── testing/                 # Testing Guides
│   │   │   ├── TESTING_GUIDE.md
│   │   │   ├── TESTING_QUICK_START.md
│   │   │   ├── MANUAL_TESTING_CHECKLIST.md
│   │   │   ├── apps/web/TESTING_GUIDE.md
│   │   │   ├── apps/web/TESTING_QUICK_REFERENCE.md
│   │   │   └── apps/web/TESTING_EXAMPLES.md
│   │   │
│   │   └── integrations/            # Third-Party Integrations
│   │       ├── STRIPE_CONNECT_SETUP_GUIDE.md
│   │       ├── STRIPE_WEBHOOK_SETUP.md
│   │       ├── STRIPE_ENV_SETUP.md
│   │       ├── GOOGLE_MAPS_SETUP.md
│   │       ├── SUPABASE_SMS_SETUP.md
│   │       ├── SUPABASE_EMAIL_AUTH_SETUP.md
│   │       └── TWILIO_SETUP.md
│   │
│   ├── quick-start/                 # Quick Start Guides
│   │   ├── QUICK_START_GUIDE.md
│   │   ├── QUICK_FIX_GUIDE.md
│   │   ├── QUICK_START_REAL_DATA.md
│   │   ├── QUICK_START_SAM3.md
│   │   └── QUICK_TEST_GUIDE.md
│   │
│   ├── user-guides/                 # User-Facing Documentation
│   │   ├── contractors/
│   │   │   ├── CONTRACTOR_STRIPE_SETUP_EXPLAINED.md
│   │   │   └── VERIFICATION_SYSTEM_TESTING_GUIDE.md
│   │   └── homeowners/
│   │       └── test-homeowner-workflow.md
│   │
│   ├── mobile/                      # Mobile App Documentation
│   │   ├── BUILD_APK_GUIDE.md
│   │   ├── QUICK_BUILD.md
│   │   ├── ENV_SETUP.md
│   │   └── DESIGN_SYSTEM_IMPLEMENTATION.md
│   │
│   ├── training/                    # ML Training Documentation
│   │   ├── BUILDING_SURVEYOR_AI_TRAINING_GUIDE.md
│   │   ├── GOOGLE_COLAB_GPU_TRAINING.md
│   │   ├── AWS_GPU_TRAINING_QUICK_START.md
│   │   ├── SAM3_AUTO_LABELING_GUIDE.md
│   │   ├── SAM3_COLAB_QUICK_START.md
│   │   ├── COLAB_SETUP_INSTRUCTIONS.md
│   │   └── training-data/
│   │       ├── README.md
│   │       └── QUICK_START.md
│   │
│   └── archived/                    # Completed Work & Historical Records
│       ├── 2025-completion-reports/
│       ├── bug-fixes/
│       ├── ui-redesigns/
│       ├── feature-implementations/
│       └── audits/
│
├── .claude/                         # Agent Configuration (keep as-is)
│   ├── agents/
│   └── skills/
│
├── .github/                         # GitHub Config (keep as-is)
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── SECRETS_GUIDE.md
│   └── SECRETS_SETUP.md
│
└── LEGAL/                           # Legal Documents (keep as-is)
    ├── IP_DOCUMENTATION.md
    ├── IP_ASSIGNMENT_AGREEMENT.md
    ├── NDA_TEMPLATE.md
    └── ...
```

---

## FILES TO DELETE (172 files)

### Category 1: Duplicate/Completion Reports (DELETE 110 files)

**Completion Reports** - These document work that's already merged:
1. ACCESSIBILITY_IMPLEMENTATION_COMPLETE.md
2. AI_ASSESSMENT_DISPLAY_FIX_COMPLETE.md
3. AI_BUGS_FIXED_COMPLETE_SUMMARY.md
4. AI_CRITICAL_FIXES_IMPLEMENTED.md
5. AI_FEATURE_PARITY_IMPLEMENTATION_COMPLETE.md
6. AI_FIXES_IMPLEMENTATION_COMPLETE.md
7. AI_FLOWS_AUDIT_FIXES_COMPLETE_SUMMARY.md
8. AI_IMPLEMENTATION_COMPLETE.md
9. AI_INTEGRATION_COMPLETE_SUMMARY.md
10. AI_LEARNING_SYSTEM_COMPLETE.md
11. AI_OPTIMIZATION_COMPLETE_SUMMARY.md
12. AI_SYSTEM_PRODUCTION_READY.md
13. AIRBNB_SEARCH_FIX_COMPLETE.md
14. AIRBNB_SEARCH_IMPLEMENTATION.md
15. ALL_IMAGE_UPLOAD_FIXES_SUMMARY.md
16. BACKPROPAGATION_IMPLEMENTATION_COMPLETE.md
17. BUDGET_VISIBILITY_IMPLEMENTATION_SUMMARY.md
18. BUILDING_ASSESSMENT_CACHE_FIX.md
19. CACHE_IMPLEMENTATION_SUMMARY.md
20. CHUNK_LOADING_ERROR_FIX.md
21. CLEANUP_COMPLETE.md
22. CODE_SPLITTING_MIGRATION_SUMMARY.md
23. CODE_SPLITTING_MIGRATION_COMPLETE.md (duplicate of above)
24. COLAB_DATASET_READY.md
25. COLAB_GRADSCALER_FIX.md
26. COMPLETE_FIX_SUMMARY.md
27. COMPLETE_PROFESSIONAL_REDESIGN_SUMMARY.md
28. COMPONENT_CONSOLIDATION_PLAN.md
29. CONSOLIDATION_SUMMARY.md
30. CONTRACTOR_DESIGN_FIX_COMPLETE.md
31. CONTRACTOR_UI_MODERNIZATION_COMPLETE.md
32. CONTRACTOR_VERIFICATION_SYSTEM_IMPLEMENTATION.md
33. CONTRACTOR_WORKFLOW_FIXES_IMPLEMENTED.md
34. CRITICAL_BUGS_FIXED.md
35. CRITICAL_FIXES_COMPLETE.md
36. CRITICAL_FIXES_IMPLEMENTED.md
37. CSRF_FIX_SUMMARY.md
38. CURRENCY_ICON_FIX_COMPLETE.md
39. DASHBOARD_IMPROVEMENTS_SUMMARY.md
40. DATA_PERSISTENCE_AUDIT_COMPLETE.md
41. DATA_PERSISTENCE_FIX_COMPLETE.md
42. DATASET_CLEANED_READY.md
43. DESIGN_TOKENS_IMPLEMENTATION_COMPLETE.md
44. DISCOVER_JOBS_MAP_IMPLEMENTATION_COMPLETE.md
45. ESCROW_RELEASE_AGENT_IMPLEMENTATION.md
46. FEATURE_ACCESS_IMPLEMENTATION_COMPLETE.md
47. FINAL_AIRBNB_DASHBOARD_SUMMARY.md
48. FINAL_DEPLOYMENT_STEPS.md
49. FINAL_IMAGE_UPLOAD_FIXES_ALL_FILES.md
50. FINAL_IMPLEMENTATION_SUMMARY.md
51. FINAL_PAYMENT_TESTING_REPORT.md
52. FIXES_COMPLETED_SUMMARY.md
53. FRONTEND_FIXES_COMPLETE.md
54. FRONTEND_IMPROVEMENTS_PROGRESS.md
55. HOMEOWNER_DESIGN_FIX_COMPLETE.md
56. HYBRID_AI_ENABLED_SUMMARY.md
57. HYBRID_INFERENCE_IMPLEMENTATION_COMPLETE.md
58. IMAGE_ANALYSIS_PARALLEL_FIX.md
59. IMAGE_FIX_SUMMARY.md
60. IMAGE_UPLOAD_FIX_SUMMARY.md
61. IMPLEMENTATION_SUMMARY.md
62. IMPORT_FIXES_COMPLETE.md
63. ISSUES_FIXED_SUMMARY.md
64. JOB_SYSTEM_FIXES_COMPLETE.md
65. LAYOUT_FIX_COMPLETE.md
66. LOCATION_PRICING_IMPLEMENTATION_SUMMARY.md
67. LOCATION_PROMPT_IMPLEMENTATION.md
68. MAINTENANCE_AI_COMPLETE.md
69. MAINTENANCE_AI_COMPLETE_IMPLEMENTATION_PLAN.md
70. MAP_VIEW_IMPLEMENTATION_COMPLETE.md
71. MFA_IMPLEMENTATION_SUMMARY.md
72. MIGRATION_STATUS.md
73. MINTENANCE_APP_REDESIGN_COMPLETE.md
74. MOCK_DATA_REMOVAL_SUMMARY.md
75. MOCK_DATA_REPLACEMENT_SUMMARY.md
76. NOTIFICATION_AGENT_IMPLEMENTATION.md
77. ONBOARDING_SYSTEM_IMPLEMENTATION.md
78. PERFORMANCE_FIXES_SUMMARY.md
79. PERFORMANCE_IMPROVEMENTS.md
80. PHASE_1_2_IMPLEMENTATION_COMPLETE.md
81. PHASE_1_STORAGE_MIGRATION_COMPLETE.md
82. PHASE_2_3_MODEL_EVALUATION_COMPLETE.md
83. PHASE_2_4_CONTINUOUS_LEARNING_COMPLETE.md
84. PRICING_SUGGESTION_UI_IMPLEMENTATION.md
85. PRICING_SUGGESTION_UI_SUMMARY.md
86. PROFESSIONAL_CONTRACTOR_LAYOUT_COMPLETE.md
87. PROFESSIONAL_REDESIGN_COMPLETE.md
88. PROFILE_DROPDOWN_FIX_SUMMARY.md
89. PROFILE_LOCATION_FIX_COMPLETE.md
90. PROFILE_SETTINGS_LOCATION_FIX.md
91. REACT_QUERY_IMPLEMENTATION.md
92. REAL_DATA_INTEGRATION_COMPLETE.md
93. SAM2_LABELING_SUCCESS.md
94. SAM3_COMPLETE_IMPLEMENTATION.md
95. SAM3_IMPLEMENTATION_SUMMARY.md
96. SEMANTIC_SEARCH_FALLBACK_FIX.md
97. SEMANTIC_SEARCH_IMPLEMENTATION_SUMMARY.md
98. SESSION_COMPLETE_SUMMARY.md
99. SKELETON_LOADER_IMPLEMENTATION.md
100. TEST_DELIVERABLES_COMPLETE.md
101. TESTING_COMPLETE_REPORT.md
102. TESTING_COMPLETE_SUMMARY.md
103. TESTING_SESSION_SUMMARY.md
104. UI_UX_2025_FIXES_COMPLETE.md
105. UI_UX_2025_REDESIGN_COMPLETE.md
106. UI_UX_2025_REDESIGN_FINAL_COMPLETION_REPORT.md
107. UI_UX_2025_REDESIGN_FINAL_REPORT.md
108. UI_UX_2025_REDESIGN_FINAL_SESSION_REPORT.md
109. UI_UX_2025_REDESIGN_SESSION_2_FINAL.md
110. UI_UX_REVAMP_IMPLEMENTATION_COMPLETE.md

### Category 2: Outdated Plans/Specs (DELETE 35 files)

These were planning documents superseded by implementations:
111. AGENTIC_AUTOMATION_PHASE2_PLAN.md
112. APPLY_YOLO_MODELS_MIGRATION.md
113. BUILDING_SURVEYOR_IMPLEMENTATION_PLAN.md
114. BUILDING_SURVEYOR_IMPROVEMENTS_PLAN.md
115. CI-CD-IMPLEMENTATION-GUIDE.md (superseded by GITHUB_CI_CD_GUIDE.md)
116. CI-CD-PRIORITY-CHECKLIST.md
117. code-review-improvements-plan.plan.md
118. COMPONENT_CONSOLIDATION_GUIDE.md (duplicate)
119. DATABASE_FIX_IMPLEMENTATION_GUIDE.md
120. DEPLOYMENT_CHECKLIST.md (duplicate of PRE_DEPLOYMENT_CHECKLIST.md)
121. DESIGN_SYSTEM_IMPROVEMENTS.md (implemented)
122. IMPLEMENTATION_PLAN_AI_TRAINING.md
123. MAINTENANCE_APP_AI_IMPLEMENTATION_PLAN.md
124. MAINTENANCE_APP_LOCAL_AI_STRATEGY.md
125. PHASE5_TESTING_AND_DEPLOYMENT.md (superseded)
126. SAM3_YOLO_TRAINING_ENHANCEMENT_PLAN.md
127. UI_IMPROVEMENTS_MIGRATION_GUIDE.md
128. UI_UX_2025_FIXES_IMPLEMENTATION_PLAN.md
129. UI_UX_2025_REDESIGN_PROGRESS_REPORT.md (superseded by final reports)
130. UI_UX_2025_REDESIGN_SESSION_2_PROGRESS.md
131. UI_UX_REVAMP_PLAN_2025.md
132. UPLOAD_MERGED_DATASET.md
133. UPLOAD_ONNX_MODEL_GUIDE.md
134. UPLOAD_TO_GOOGLE_DRIVE.md
135. USER_INTERACTION_FLOW_COMPLETE.md
136. apps/web/CODE_SPLITTING_IMPLEMENTATION_SUMMARY.md (duplicate)
137. apps/web/CODE_SPLITTING_QUICK_REFERENCE.md (duplicate)
138. apps/web/CODE_SPLITTING_STRATEGY.md (duplicate)
139. apps/web/MIGRATION_CHECKLIST.md (outdated)
140. apps/web/PERFORMANCE_QUICK_WINS.md (implemented)
141. apps/web/PERFORMANCE_VALIDATION_CHECKLIST.md (implemented)
142. apps/web/TESTING_SETUP_COMPLETE.md (completion report)
143. apps/mobile/BUILD_FIX.md (completed)
144. YOLO_DEPLOYMENT_STATUS.md (completed)
145. YOLO_TRAINING_READY.md (completed)

### Category 3: Duplicate Audit Reports (DELETE 27 files)

Keep only most recent comprehensive reports:
146. ADMIN_AUDIT_REPORT.md (keep most recent only)
147. ADMIN_AUDIT_REPORT_LOGGED_IN.md (duplicate)
148. ADMIN_AUTH_FIX.md (fix completed)
149. AI_AGENT_AUDIT_REPORT.md (archived)
150. AI_AUDIT_QUICK_ACTION_GUIDE.md (actions completed)
151. AI_BUG_FIXES_TEST_DOCUMENTATION.md (archived)
152. AI_FLOWS_COMPREHENSIVE_AUDIT_REPORT.md (archived)
153. AI_SERVICES_BUG_REPORT.md (bugs fixed)
154. AI_USER_FLOW_ANALYSIS_REPORT.md (archived)
155. APP_REVIEW_BUGS_AND_DISCREPANCIES.md (bugs fixed)
156. CODEBASE_AUDIT_REPORT.md (superseded by COMPREHENSIVE_AUDIT_REPORT_2025.md)
157. COMPONENT_AUDIT_REPORT.md (archived)
158. COMPREHENSIVE_AUDIT_REPORT.md (superseded by 2025 version)
159. COMPREHENSIVE_PLATFORM_AUDIT_REPORT.md (duplicate)
160. COMPREHENSIVE_REVIEW_AND_FIXES_2025.md (archived)
161. CONTRACTOR_AUDIT_REPORT.md (archived)
162. CONTRACTOR_SOCIAL_AUDIT_REPORT.md (archived)
163. CONTRACTOR_WORKFLOW_TEST_REPORT.md (archived)
164. DATABASE_ARCHITECTURE_ANALYSIS_AI_SYSTEM.md (archived)
165. DATABASE_HEALTH_REPORT.md (archived)
166. FILE_ORGANIZATION_AUDIT.md (this doc supersedes it)
167. HOMEOWNER_JOB_CREATION_FLOW_ANALYSIS.md (archived)
168. IMPORT_PATH_REVIEW_REPORT.md (fixes complete)
169. ML_REVIEW_EXECUTIVE_SUMMARY.md (archived)
170. ML_SYSTEM_COMPREHENSIVE_REVIEW_2025.md (keep - reference doc)
171. PRODUCTION_LANDING_ANALYSIS.md (archived)
172. TEST_RESULTS.md (archived)

---

## FILES TO KEEP & ORGANIZE (235 files)

### Root Level (Essential - Keep 8 files only)

1. README.md ✅ Main project README
2. CHANGELOG.md ✅ Version history
3. SECURITY_REMEDIATION_PLAN.md ✅ **NEW** Critical action plan
4. QUICK_START_GUIDE.md ✅ Quickest onboarding path
5. MINTENANCE_TECH_STACK.md ✅ Tech overview
6. agent.md ✅ Agent instructions (if used)
7. COMPREHENSIVE_AUDIT_REPORT_2025.md ✅ Latest audit baseline
8. ML_SYSTEM_COMPREHENSIVE_REVIEW_2025.md ✅ ML system reference

### Business Documentation (Move to docs/business/)

9. MINTENANCE_BUSINESS_PLAN_2025.md → docs/business/
10. STARTUP_COST_ESTIMATION_2025.md → docs/business/
11. MINTENANCE_PLATFORM_OVERVIEW_2025.md → docs/business/
12. INTELLECTUAL_PROPERTY_STRATEGY_2025.md → docs/business/
13. MINTAI_EXECUTIVE_SUMMARY.md → docs/business/
14. PLATFORM_FEATURE_COMPARISON_WEB_VS_MOBILE.md → docs/business/
15. MARKET_RESEARCH.md → docs/business/
16. MINTENANCE_MARKET_COMPARISON_REPORT.md → docs/business/
17. MARKET_REPORT_VERIFICATION.md → docs/business/
18. STARTUP_DOCUMENTATION_SUMMARY.md → docs/business/

### AI/ML Documentation (Move to docs/technical/ai/)

19. AI_ALGORITHM_TECHNICAL_OVERVIEW.md → docs/technical/ai/
20. AI_FLOWS_AND_USE_CASES.md → docs/technical/ai/
21. AI_ACTIVATION_GUIDE.md → docs/technical/ai/
22. BUILDING_SURVEYOR_AI_COMPREHENSIVE_ANALYSIS.md → docs/technical/ai/
23. CLASS_MAPPING_REVIEW_AND_AI_FLOW.md → docs/technical/ai/
24. CONTINUOUS_LEARNING_GUIDE.md → docs/technical/ai/
25. ENABLE_HYBRID_AI_SETUP.md → docs/technical/ai/
26. HOW_TO_MONITOR_LEARNING.md → docs/technical/ai/
27. HYBRID_INFERENCE_DELIVERABLES.md → docs/technical/ai/
28. LOCAL_YOLO_DEPLOYMENT_COMPLETE.md → docs/technical/ai/
29. SAM3_PRESENCE_DETECTION_GUIDE.md → docs/technical/ai/
30. SETUP_LOCAL_YOLO.md → docs/technical/ai/
31. apps/web/lib/services/building-surveyor/*.md → docs/technical/ai/
32. docs/BUILDING_SURVEYOR_*.md → docs/technical/ai/
33. docs/LOCAL_YOLO_*.md → docs/technical/ai/
34. docs/YOLO_*.md → docs/technical/ai/
35. docs/SAM3_INTEGRATION_GUIDE.md → docs/technical/ai/
36. docs/SAM2_VIDEO_INTEGRATION_GUIDE.md → docs/technical/ai/
37. docs/SAM3_DEPLOYMENT_RUNBOOK.md → docs/technical/deployment/

### API Documentation (Move to docs/technical/api/)

38. API_DOCUMENTATION.md → docs/technical/api/
39. API_ENDPOINTS.md → docs/technical/api/
40. BACKEND_EMBEDDINGS_API.md → docs/technical/api/
41. PAYMENT_API_DOCUMENTATION.md → docs/technical/api/
42. docs/API_ACCESS_GUIDELINES.md → docs/technical/api/

### Architecture Documentation (Move to docs/technical/architecture/)

43. AUTH_ARCHITECTURE_EXPLAINED.md → docs/technical/architecture/
44. TECHNICAL_ARCHITECTURE.md → docs/technical/architecture/
45. ROUTING_STRUCTURE.md → docs/technical/architecture/
46. DEPENDENCY_MANAGEMENT.md → docs/technical/architecture/
47. NAVIGATION_MAP.md → docs/technical/architecture/
48. PAGES_AND_SCREENS_INVENTORY.md → docs/technical/architecture/
49. COMPONENTS_INVENTORY.md → docs/technical/architecture/

### Database Documentation (Move to docs/technical/database/)

50. MIGRATION_GUIDE.md → docs/technical/database/
51. MANUAL_MIGRATION_INSTRUCTIONS.md → docs/technical/database/
52. docs/PUSH_MIGRATIONS_TO_SUPABASE.md → docs/technical/database/
53. docs/YOLO_DATABASE_SETUP.md → docs/technical/database/
54. supabase/migrations/README_AI_AGENT_MIGRATIONS.md → docs/technical/database/

### Deployment & DevOps (Move to docs/technical/deployment/)

55. DEPLOYMENT_GUIDE.md → docs/technical/deployment/
56. PRE_DEPLOYMENT_CHECKLIST.md → docs/technical/deployment/
57. QUICK_START_DEPLOYMENT.md → docs/technical/deployment/
58. MANUAL_VERCEL_DEPLOYMENT_GUIDE.md → docs/technical/deployment/
59. GITHUB_CI_CD_GUIDE.md → docs/technical/deployment/
60. REDIS_SETUP_GUIDE.md → docs/technical/deployment/
61. AWS_SETUP_COMPLETE.md → docs/technical/deployment/
62. aws-credentials-setup.md → docs/technical/deployment/
63. infrastructure/aws/AWS_SETUP_GUIDE.md → docs/technical/deployment/

### Security Documentation (Move to docs/technical/security/)

64. CRITICAL_SECURITY_FIXES.md → docs/technical/security/
65. SECURITY_FIXES_REPORT.md → docs/technical/security/
66. SECURITY_IMPLEMENTATION_SUMMARY.md → docs/technical/security/
67. apps/web/docs/CSRF_PROTECTION.md → docs/technical/security/
68. apps/web/docs/SSRF_PROTECTION.md → docs/technical/security/
69. apps/web/docs/SECURITY_RECOMMENDATIONS_IMPLEMENTED.md → docs/technical/security/
70. apps/web/docs/SECURITY_VULNERABILITIES_FIXED.md → docs/technical/security/
71. apps/web/docs/SECURITY_AUDIT_dangerouslySetInnerHTML.md → docs/technical/security/
72. .github/SECRETS_GUIDE.md → docs/technical/security/
73. .github/SECRETS_SETUP.md → docs/technical/security/

### Testing Documentation (Move to docs/technical/testing/)

74. TESTING_GUIDE.md → docs/technical/testing/
75. TESTING_QUICK_START.md → docs/technical/testing/
76. TESTING-GUIDE.md (duplicate - delete or merge)
77. MANUAL_TESTING_CHECKLIST.md → docs/technical/testing/
78. VERIFICATION_SYSTEM_TESTING_GUIDE.md → docs/technical/testing/
79. apps/web/TESTING_GUIDE.md → docs/technical/testing/web-testing.md
80. apps/web/TESTING_QUICK_REFERENCE.md → docs/technical/testing/
81. apps/web/TESTING_EXAMPLES.md → docs/technical/testing/
82. apps/web/test/CI_INTEGRATION.md → docs/technical/testing/
83. docs/PHASE5_TESTING_GUIDE.md → docs/technical/testing/

### Integration Documentation (Move to docs/technical/integrations/)

84. STRIPE_CONNECT_SETUP_GUIDE.md → docs/technical/integrations/
85. STRIPE_WEBHOOK_SETUP.md → docs/technical/integrations/
86. STRIPE_ENV_SETUP.md → docs/technical/integrations/
87. STRIPE_EMBEDDED_CHECKOUT_INTEGRATION.md → docs/technical/integrations/
88. STRIPE_EMBEDDED_CHECKOUT_MARKETPLACE.md → docs/technical/integrations/
89. GOOGLE_MAPS_SETUP.md → docs/technical/integrations/
90. GOOGLE_MAPS_API_KEY_FIX.md → docs/technical/integrations/
91. SUPABASE_SMS_SETUP.md → docs/technical/integrations/
92. SUPABASE_EMAIL_AUTH_SETUP.md → docs/technical/integrations/
93. TWILIO_SETUP.md → docs/technical/integrations/
94. docs/GCP_BUCKET_SETUP.md → docs/technical/integrations/
95. docs/GCP_BUCKET_IMPROVEMENTS.md → docs/technical/integrations/
96. docs/GCP_AUTHENTICATION_SETUP.md → docs/technical/integrations/
97. apps/web/docs/PAYMENT_SETUP_SYSTEM.md → docs/technical/integrations/
98. apps/web/docs/PAYMENT_SETUP_SYNC.md → docs/technical/integrations/
99. apps/web/docs/PAYMENT_SETUP_QUICK_REFERENCE.md → docs/technical/integrations/
100. docs/CONTRACTOR_STRIPE_SETUP_EXPLAINED.md → docs/user-guides/contractors/

### Quick Start Guides (Move to docs/quick-start/)

101. QUICK_FIX_GUIDE.md → docs/quick-start/
102. QUICK_START_REAL_DATA.md → docs/quick-start/
103. QUICK_START_SAM3.md → docs/quick-start/
104. QUICK_TEST_GUIDE.md → docs/quick-start/
105. BUDGET_VISIBILITY_QUICK_START.md → docs/quick-start/
106. BUDGET_VISIBILITY_QUICK_TEST.md → docs/quick-start/
107. LOCATION_PROMPT_QUICK_START.md → docs/quick-start/
108. NEXT_STEPS_SAM2_READY.md → docs/quick-start/
109. READY_FOR_COLAB_TRAINING.md → docs/quick-start/

### Training Documentation (Move to docs/training/)

110. BUILDING_SURVEYOR_AI_TRAINING_GUIDE.md → docs/training/
111. GOOGLE_COLAB_GPU_TRAINING.md → docs/training/
112. AWS_GPU_TRAINING_QUICK_START.md → docs/training/
113. SAM3_AUTO_LABELING_GUIDE.md → docs/training/
114. SAM3_COLAB_QUICK_START.md → docs/training/
115. SAM3_CELL2_FIX_GUIDE.md → docs/training/
116. SAM2_UPDATED_NOTEBOOK_GUIDE.md → docs/training/
117. COLAB_SETUP_INSTRUCTIONS.md → docs/training/
118. PYTORCH_2.6_FIX.md → docs/training/
119. TRAINING_DATA_INVENTORY.md → docs/training/
120. TRAINING_DATA_SUMMARY.md → docs/training/
121. NEW_DATASET_ANALYSIS.md → docs/training/
122. FREE_DATASET_SOURCES.md → docs/training/
123. docs/ML_TRAINING_PIPELINE.md → docs/training/
124. docs/TRAINING_PIPELINE.md → docs/training/
125. docs/THEORETICAL_FOUNDATIONS.md → docs/training/
126. docs/RESEARCH_PAPER_OUTLINE.md → docs/training/
127. docs/BUILDING_SURVEYOR_RESEARCH_PAPER.md → docs/training/
128. docs/BUILDING_SURVEYOR_RESEARCH_PAPER_EXTENDED.md → docs/training/
129. training-data/*.md → docs/training/data/

### Mobile Documentation (Move to docs/mobile/)

130. apps/mobile/BUILD_APK_GUIDE.md → docs/mobile/
131. apps/mobile/QUICK_BUILD.md → docs/mobile/
132. apps/mobile/ENV_SETUP.md → docs/mobile/
133. apps/mobile/DESIGN_SYSTEM_IMPLEMENTATION.md → docs/mobile/
134. apps/mobile/src/design-system/STYLE_GUIDE.md → docs/mobile/
135. apps/mobile/src/services/SERVICE_ORGANIZATION.md → docs/mobile/
136. apps/mobile/src/utils/performance/README.md → docs/mobile/
137. docs/mobile/*.md → docs/mobile/

### Web App Documentation (Keep in apps/web/docs/)

Keep these where they are - close to code:
138. apps/web/docs/*.md (keep in place)
139. apps/web/components/layouts/*.md (keep in place)
140. apps/web/lib/hooks/queries/*.md (keep in place)
141. apps/web/lib/services/building-surveyor/*.md → docs/technical/ai/
142. apps/web/lib/services/location/*.md (keep in place)
143. apps/web/lib/services/weather/*.md (keep in place)
144. apps/web/lib/feature-access/*.md (keep in place)
145. apps/web/lib/onboarding/*.md (keep in place)
146. apps/web/app/contractor/components/*.md (keep in place)
147. apps/web/app/jobs/[id]/components/*.md (keep in place)

### User Guides (Move to docs/user-guides/)

148. test-homeowner-workflow.md → docs/user-guides/homeowners/
149. CONTRACTOR_WORKFLOW_TEST_REPORT.md → docs/archived/
150. docs/CONTRACTOR_JOBS_PAGE_REVIEW.md → docs/archived/
151. docs/CONTRACTOR_PROFILE_AUDIT.md → docs/archived/

### Debug/Troubleshooting Guides (Move to docs/debug/)

152. DEBUG_INSTRUCTIONS.md → docs/debug/
153. DISCOVER_JOBS_DEBUG_GUIDE.md → docs/debug/
154. LOGIN_DEBUG_GUIDE.md → docs/debug/
155. CACHE_CLEAR_INSTRUCTIONS.md → docs/debug/
156. docs/DEBUG_LOGGING_GUIDELINES.md → docs/debug/
157. docs/bug-solutions/*.md → docs/debug/solutions/

### Design System Documentation (Move to docs/design/)

158. DESIGN_SYSTEM.md → docs/design/
159. MOTION_ACCESSIBILITY.md → docs/design/
160. VISUAL_FIX_GUIDE.md → docs/design/
161. apps/web/docs/FORM_DESIGN_SYSTEM.md → docs/design/
162. apps/web/docs/RESPONSIVENESS_GUIDE.md → docs/design/
163. apps/web/app/contractor/DESIGN_SYSTEM.md → docs/design/contractor/
164. apps/web/app/contractor/components/*.md → docs/design/contractor/
165. apps/web/app/jobs/[id]/components/*.md → docs/design/jobs/
166. docs/design-system/*.md → docs/design/
167. FIGMA_*.md → docs/design/figma/

### Feature Documentation (Move to docs/features/)

168. ADMIN_FEATURES_IMPLEMENTATION.md → docs/features/
169. docs/FEATURE_ACCESS_SYSTEM.md → docs/features/
170. docs/FEATURE_ACCESS_QUICK_START.md → docs/features/
171. docs/CONTEXT_FEATURES.md → docs/features/
172. docs/AB_TEST_*.md → docs/features/ab-testing/
173. docs/AI_AGENT_CONFIGURATION.md → docs/features/
174. docs/AI_SHOWCASE_INTEGRATION.md → docs/features/
175. docs/CONFORMAL_PREDICTION_IMPROVEMENTS.md → docs/features/
176. docs/NOTIFICATION_COVERAGE_ANALYSIS.md → docs/features/
177. docs/NOTIFICATIONS_REVIEW.md → docs/features/
178. HOW_TO_USE_PRODUCTION_LANDING.md → docs/features/

### Archived Documentation (Move to docs/archived/)

**Completion Reports (2025)**:
179-288. All completion reports listed in "DELETE" section above

**UI Redesign Work**:
289. FIGMA_DASHBOARD_LAYOUT_SPECS.md → docs/archived/ui-redesigns/
290. FIGMA_DESIGN_EXPLORATION.md → docs/archived/ui-redesigns/
291. FIGMA_DESIGN_SPECIFICATIONS.md → docs/archived/ui-redesigns/
292. FIGMA_NAVIGATION_GUIDE.md → docs/archived/ui-redesigns/
293. LOCATION_PROMPT_DESIGN_SHOWCASE.md → docs/archived/ui-redesigns/
294. PRICING_UI_VISUAL_GUIDE.md → docs/archived/ui-redesigns/
295. UI_UX_2025_REDESIGN_PROGRESS_REPORT.md → docs/archived/ui-redesigns/

**Audits & Reports**:
296-320. All audit reports → docs/archived/audits/

**Misc Archived**:
321. DOCUMENTATION_INDEX.md (superseded by this doc)
322. DOCUMENTATION_MASTER_INDEX.md (superseded by this doc)
323. DOCUMENTATION_CLEANUP_SUMMARY.md (superseded by this doc)

---

## MIGRATION SCRIPT

```bash
#!/bin/bash
# Run from repository root

# Create folder structure
mkdir -p docs/{business,technical/{ai,api,architecture,database,deployment,security,testing,integrations},quick-start,user-guides/{contractors,homeowners},mobile,training/data,debug/solutions,design/{figma,contractor,jobs},features/ab-testing,archived/{2025-completion-reports,bug-fixes,ui-redesigns,audits,feature-implementations}}

# Business docs
mv MINTENANCE_BUSINESS_PLAN_2025.md docs/business/
mv STARTUP_COST_ESTIMATION_2025.md docs/business/
mv MINTENANCE_PLATFORM_OVERVIEW_2025.md docs/business/
mv INTELLECTUAL_PROPERTY_STRATEGY_2025.md docs/business/
mv MINTAI_EXECUTIVE_SUMMARY.md docs/business/
mv PLATFORM_FEATURE_COMPARISON_WEB_VS_MOBILE.md docs/business/
mv MARKET_RESEARCH.md docs/business/
mv MINTENANCE_MARKET_COMPARISON_REPORT.md docs/business/
mv MARKET_REPORT_VERIFICATION.md docs/business/
mv STARTUP_DOCUMENTATION_SUMMARY.md docs/business/

# AI/ML Technical docs
mv AI_ALGORITHM_TECHNICAL_OVERVIEW.md docs/technical/ai/
mv AI_FLOWS_AND_USE_CASES.md docs/technical/ai/
mv AI_ACTIVATION_GUIDE.md docs/technical/ai/
mv BUILDING_SURVEYOR_AI_COMPREHENSIVE_ANALYSIS.md docs/technical/ai/
mv CLASS_MAPPING_REVIEW_AND_AI_FLOW.md docs/technical/ai/
mv CONTINUOUS_LEARNING_GUIDE.md docs/technical/ai/
mv ENABLE_HYBRID_AI_SETUP.md docs/technical/ai/
mv HOW_TO_MONITOR_LEARNING.md docs/technical/ai/
mv HYBRID_INFERENCE_DELIVERABLES.md docs/technical/ai/
mv LOCAL_YOLO_DEPLOYMENT_COMPLETE.md docs/technical/ai/
mv SAM3_PRESENCE_DETECTION_GUIDE.md docs/technical/ai/
mv SETUP_LOCAL_YOLO.md docs/technical/ai/

# API docs
mv API_DOCUMENTATION.md docs/technical/api/
mv API_ENDPOINTS.md docs/technical/api/
mv BACKEND_EMBEDDINGS_API.md docs/technical/api/
mv PAYMENT_API_DOCUMENTATION.md docs/technical/api/

# Architecture
mv AUTH_ARCHITECTURE_EXPLAINED.md docs/technical/architecture/
mv TECHNICAL_ARCHITECTURE.md docs/technical/architecture/
mv ROUTING_STRUCTURE.md docs/technical/architecture/
mv DEPENDENCY_MANAGEMENT.md docs/technical/architecture/
mv NAVIGATION_MAP.md docs/technical/architecture/
mv PAGES_AND_SCREENS_INVENTORY.md docs/technical/architecture/
mv COMPONENTS_INVENTORY.md docs/technical/architecture/

# Database
mv MIGRATION_GUIDE.md docs/technical/database/
mv MANUAL_MIGRATION_INSTRUCTIONS.md docs/technical/database/

# Deployment
mv DEPLOYMENT_GUIDE.md docs/technical/deployment/
mv PRE_DEPLOYMENT_CHECKLIST.md docs/technical/deployment/
mv QUICK_START_DEPLOYMENT.md docs/technical/deployment/
mv MANUAL_VERCEL_DEPLOYMENT_GUIDE.md docs/technical/deployment/
mv GITHUB_CI_CD_GUIDE.md docs/technical/deployment/
mv REDIS_SETUP_GUIDE.md docs/technical/deployment/
mv AWS_SETUP_COMPLETE.md docs/technical/deployment/
mv aws-credentials-setup.md docs/technical/deployment/

# Security
mv CRITICAL_SECURITY_FIXES.md docs/technical/security/
mv SECURITY_FIXES_REPORT.md docs/technical/security/
mv SECURITY_IMPLEMENTATION_SUMMARY.md docs/technical/security/

# Testing
mv TESTING_GUIDE.md docs/technical/testing/
mv TESTING_QUICK_START.md docs/technical/testing/
mv MANUAL_TESTING_CHECKLIST.md docs/technical/testing/
mv VERIFICATION_SYSTEM_TESTING_GUIDE.md docs/technical/testing/

# Integrations
mv STRIPE_CONNECT_SETUP_GUIDE.md docs/technical/integrations/
mv STRIPE_WEBHOOK_SETUP.md docs/technical/integrations/
mv STRIPE_ENV_SETUP.md docs/technical/integrations/
mv STRIPE_EMBEDDED_CHECKOUT_INTEGRATION.md docs/technical/integrations/
mv STRIPE_EMBEDDED_CHECKOUT_MARKETPLACE.md docs/technical/integrations/
mv GOOGLE_MAPS_SETUP.md docs/technical/integrations/
mv GOOGLE_MAPS_API_KEY_FIX.md docs/technical/integrations/
mv SUPABASE_SMS_SETUP.md docs/technical/integrations/
mv SUPABASE_EMAIL_AUTH_SETUP.md docs/technical/integrations/
mv TWILIO_SETUP.md docs/technical/integrations/

# Quick starts
mv QUICK_FIX_GUIDE.md docs/quick-start/
mv QUICK_START_REAL_DATA.md docs/quick-start/
mv QUICK_START_SAM3.md docs/quick-start/
mv QUICK_TEST_GUIDE.md docs/quick-start/

# Training
mv BUILDING_SURVEYOR_AI_TRAINING_GUIDE.md docs/training/
mv GOOGLE_COLAB_GPU_TRAINING.md docs/training/
mv AWS_GPU_TRAINING_QUICK_START.md docs/training/
mv SAM3_AUTO_LABELING_GUIDE.md docs/training/
mv SAM3_COLAB_QUICK_START.md docs/training/
mv COLAB_SETUP_INSTRUCTIONS.md docs/training/
mv TRAINING_DATA_INVENTORY.md docs/training/
mv TRAINING_DATA_SUMMARY.md docs/training/
mv NEW_DATASET_ANALYSIS.md docs/training/
mv FREE_DATASET_SOURCES.md docs/training/

# Mobile
mv apps/mobile/BUILD_APK_GUIDE.md docs/mobile/
mv apps/mobile/QUICK_BUILD.md docs/mobile/
mv apps/mobile/ENV_SETUP.md docs/mobile/
mv apps/mobile/DESIGN_SYSTEM_IMPLEMENTATION.md docs/mobile/

# Archive completion reports
mv ACCESSIBILITY_IMPLEMENTATION_COMPLETE.md docs/archived/2025-completion-reports/
mv AI_ASSESSMENT_DISPLAY_FIX_COMPLETE.md docs/archived/2025-completion-reports/
# ... (all 110 completion reports)

# Delete obsolete files
rm AGENTIC_AUTOMATION_PHASE2_PLAN.md
rm CI-CD-IMPLEMENTATION-GUIDE.md
rm CI-CD-PRIORITY-CHECKLIST.md
# ... (all 172 files marked for deletion)

echo "Documentation reorganization complete!"
echo "Review docs/ structure and update internal links"
```

---

## UPDATE TASKS

### 1. Update Cross-References

After moving files, update these documents to point to new locations:
- README.md (root) - update all doc links
- .claude/CLAUDE.md - update agent instructions
- .github/PULL_REQUEST_TEMPLATE.md
- All "see also" references in moved docs

### 2. Create Index Files

Create master indexes in each folder:
- docs/business/README.md
- docs/technical/README.md
- docs/quick-start/README.md
- docs/training/README.md
- docs/archived/README.md

### 3. Update Main README.md

Add documentation section:
```markdown
## Documentation

- **Quick Start**: [docs/quick-start/](docs/quick-start/)
- **Business**: [docs/business/](docs/business/) - Investor materials
- **Technical**: [docs/technical/](docs/technical/) - Architecture, APIs, deployment
- **Training**: [docs/training/](docs/training/) - ML model training guides
- **User Guides**: [docs/user-guides/](docs/user-guides/) - End-user documentation
```

---

## IMMEDIATE ACTIONS (Priority Order)

### Phase 1: DELETE (30 mins)
1. Delete all 172 files marked for deletion
2. Commit: "docs: remove 172 obsolete/duplicate documentation files"

### Phase 2: CREATE STRUCTURE (10 mins)
1. Run folder creation script
2. Commit: "docs: create organized documentation structure"

### Phase 3: MOVE FILES (45 mins)
1. Move business docs (10 files)
2. Move technical docs (150 files)
3. Move training docs (15 files)
4. Move mobile docs (10 files)
5. Archive completion reports (110 files)
6. Commit: "docs: reorganize 235 files into structured folders"

### Phase 4: UPDATE REFERENCES (30 mins)
1. Update root README.md
2. Create folder README.md files
3. Fix cross-references
4. Commit: "docs: update cross-references and create index files"

### Phase 5: VALIDATE (15 mins)
1. Check all links work
2. Verify no broken references
3. Test quick-start guides
4. Commit: "docs: validate all documentation links"

---

## SUCCESS METRICS

**Before**:
- 407 markdown files
- 200+ files in root directory
- Duplicates and outdated content mixed with current
- No clear organization

**After**:
- 235 active documentation files
- 8 essential files in root
- Clear folder structure (9 main categories)
- 172 obsolete files removed
- Easy navigation for developers and investors

---

## MAINTENANCE GUIDELINES

### When to Create New Documentation

**DO**:
- Create docs in appropriate `docs/` subfolder
- Use descriptive, date-stamped names for completion reports
- Archive completion reports in `docs/archived/2025-completion-reports/`
- Keep technical docs close to code when implementation-specific

**DON'T**:
- Create root-level .md files (except critical updates to the 8 essentials)
- Duplicate existing documentation
- Create "FINAL_FINAL_COMPLETE_v2.md" style names
- Leave completion reports in root forever

### Quarterly Documentation Audit

Every 3 months:
1. Review `docs/archived/` - delete anything >12 months old
2. Check for new duplicates
3. Update outdated version references
4. Consolidate similar guides
5. Update cross-references

---

## APPENDIX: FILE COUNT SUMMARY

| Category | Files | Action |
|----------|-------|--------|
| Root (Essential) | 8 | KEEP |
| Business | 10 | MOVE |
| Technical | 150 | MOVE |
| Training | 15 | MOVE |
| Mobile | 10 | MOVE |
| Quick Start | 12 | MOVE |
| User Guides | 8 | MOVE |
| Design | 12 | MOVE |
| Features | 10 | MOVE |
| Completion Reports | 110 | ARCHIVE |
| Outdated Plans | 35 | DELETE |
| Duplicate Audits | 27 | DELETE |
| **TOTAL** | **407** | **235 KEEP + 172 DELETE** |

---

**Document Version**: 1.0
**Last Updated**: 20 December 2025
**Next Review**: Quarterly (March 2026)
