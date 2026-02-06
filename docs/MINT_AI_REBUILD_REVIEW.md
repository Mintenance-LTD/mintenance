# Mint AI Rebuild Plan – Implementation Review

**Reviewed:** 2025-01-30  
**Scope:** Phases 1–7; alignment with agentic VLM rebuild plan.

---

## Summary

Phases **1–7** are implemented:

- **Phase 1–3:** Schema, tools, evidence, agent loop, API/UnifiedAIService wiring (and assess route bug fix).
- **Phase 4:** In-house VLM at generate – `MINT_AI_VLM_ENDPOINT` calls in-house model; fallback to GPT-4o.
- **Phase 5:** RAG / long-term memory – `propertyId` in API and UnifiedAIService; `property_id` on `building_assessments`; RetrieveMemoryTool already queries by `property_id`.
- **Phase 6:** Extensibility – domain-aware planner (`domain`: building | rail | infrastructure | general); API and UnifiedAIService pass `domain`; taxonomy supports multiple domains.
- **Phase 7:** Verifier + observability – verifier logging in AgentRunner; GET `/api/building-surveyor/verification-stats` (admin) for counts by `validation_status` and needs_review rate.

---

## Phase 1: Schema and Damage Taxonomy ✅

**Location:** `supabase/migrations/20260130120000_damage_taxonomy_and_evidence.sql`

| Deliverable | Status | Notes |
|-------------|--------|--------|
| `damage_taxonomy` table | ✅ | domain, material, damage_family, damage_type, display_name, severity_mapping, can_progress_from; UNIQUE(domain, damage_type) |
| Seed building domain | ✅ | 15 damage types (pipe_leak, water_damage, wall_crack, roof_damage, etc.) |
| `assessment_evidence` table | ✅ | assessment_id, tool_name, step_index, input_refs, output_summary, confidence_aggregate; FK to building_assessments |
| Extend `building_assessments` | ✅ | damage_taxonomy_id, domain, material (nullable, backward compatible) |
| Optional `building_assessment_outcomes` | ✅ | actual_damage_taxonomy_id |
| RLS | ✅ | damage_taxonomy read-all; assessment_evidence select via assessment owner, insert service, admin all |

**Verdict:** Phase 1 is complete and matches the plan.

---

## Phase 2: Tool Layer and Evidence Recording ✅

**Location:** `apps/web/lib/services/building-surveyor/tools/`

| Deliverable | Status | Notes |
|-------------|--------|--------|
| Tool contracts (types) | ✅ | `types.ts` – DetectToolResult, SegmentToolResult, VisionLabelsToolResult, RetrieveMemoryToolResult |
| EvidenceWriter | ✅ | `EvidenceWriter.ts` – writeEvidence(assessment_id, tool_name, step_index, input_refs, output_summary, confidence_aggregate) |
| Damage-type mapping | ✅ | `damage-type-mapping.ts` – detector classes → damage_taxonomy.damage_type |
| Taxonomy lookup | ✅ | `taxonomy.ts` – getDamageTypesForDomain(domain), getDamageTaxonomyId(domain, damageType) |
| DetectTool | ✅ | `DetectTool.ts` – Roboflow detection, returns detections + damageTypesDetected |
| SegmentTool | ✅ | `SegmentTool.ts` – SAM3 segmentation by damage types |
| VisionLabelsTool | ✅ | `VisionLabelsTool.ts` – Google Vision labels + detectedFeatures |
| RetrieveMemoryTool | ✅ | `RetrieveMemoryTool.ts` – past assessments by jobId/propertyId (optional featureVector) |
| runToolSequence | ✅ | `runToolSequence.ts` – runs detect → segment → vision_labels → retrieve_memory, writes evidence for each step |

**Verdict:** Phase 2 is complete. Tools and evidence writing are implemented and used by the agent.

---

## Phase 3: Agent Loop (Planner + Executor) ✅

**Location:** `apps/web/lib/services/building-surveyor/agent/AgentRunner.ts`

| Deliverable | Status | Notes |
|-------------|--------|--------|
| Planner | ✅ | planToolCalls() – fixed sequence: detect, segment(damage_types from taxonomy), vision_labels, retrieve_memory(jobId, propertyId) |
| Executor | ✅ | runToolSequenceAndWriteEvidence() then BuildingSurveyorService.assessDamage with preRunEvidence |
| Pre-run evidence | ✅ | roboflowDetections, visionAnalysis, sam3Segmentation passed to assessDamage; detectors skipped when set |
| Taxonomy-driven prompt | ✅ | damageTypesForPrompt from getDamageTypesForDomain('building') passed to assessDamage |
| API route wiring | ✅ | Placeholder row → runAgent → update row; assessmentIdForImages for image associations |
| UnifiedAIService wiring | ✅ | When context.userId present: placeholder row → runAgent → update row + damage_taxonomy_id; else direct BuildingSurveyorService.assessDamage |

**BuildingSurveyorService.assessDamage:** Accepts `options.preRunEvidence` and `options.damageTypesForPrompt`; uses them when provided and skips detector calls for preRunEvidence. System prompt built with damageTypesForPrompt (Phase 6–ready).

**Bug fixed during review:** The assess route was assigning the full `runAgent()` return `{ assessment, needsReview }` to `assessment`, then using `assessment.damageAssessment` etc., which would be undefined. Fixed by destructuring: `const agentResult = await runAgent(...); assessment = agentResult.assessment` and using `agentResult.needsReview` for `validation_status: 'needs_review'` when the verifier flags misalignment.

**Verdict:** Phase 3 is complete and correctly wired after the fix.

---

## Phase 7: Verification (Early) ✅

**Location:** `apps/web/lib/services/building-surveyor/agent/AssessmentVerifier.ts`

| Deliverable | Status | Notes |
|-------------|--------|--------|
| verifyAlignment | ✅ | Compares narrative damage_type to detectDamageTypes and segmentDamageTypes; returns { aligned, needsReview } |
| AgentRunner integration | ✅ | runAgent() calls verifyAlignment(assessment, { detectDamageTypes, segmentDamageTypes }), returns needsReview |
| DB/API use of needsReview | ✅ | UnifiedAIService sets validation_status to 'needs_review' when result.needsReview; assess route sets validation_status to 'needs_review' when agentResult.needsReview |

**Verdict:** Phase 7 verifier is implemented and used.

---

## Phase 4: In-House VLM at Generate ✅

**Location:** `apps/web/lib/services/building-surveyor/generator/AssessmentGenerator.ts`

| Deliverable | Status | Notes |
|-------------|--------|--------|
| In-house VLM endpoint | ✅ | When `MINT_AI_VLM_ENDPOINT` is set, calls that URL (OpenAI-compatible chat completions); optional `MINT_AI_VLM_API_KEY` |
| Fallback | ✅ | On endpoint failure or when endpoint not set, falls back to GPT-4o |
| Stub when flag only | ✅ | When `USE_MINT_AI_VLM=true` but no endpoint, stub delegates to GPT-4o and returns model `mint-ai-vlm` |

**Env:** `MINT_AI_VLM_ENDPOINT`, `MINT_AI_VLM_API_KEY` (optional), `USE_MINT_AI_VLM` (stub).

---

## Phase 5: RAG / Long-Term Memory ✅

**Schema:** `building_assessments.property_id` (migration `20260130130000_add_property_id_to_building_assessments.sql`).

| Deliverable | Status | Notes |
|-------------|--------|--------|
| API request | ✅ | `assessRequestSchema` includes `propertyId` (optional UUID) |
| API insert/update | ✅ | Placeholder and hybrid-path inserts set `property_id`; runAgent receives `propertyId` |
| UnifiedAIService | ✅ | Placeholder insert sets `property_id: context.propertyId`; runAgent receives `propertyId` |
| RetrieveMemoryTool | ✅ | Already queries past assessments by `property_id` and `job_id` |

**Verdict:** RAG/long-term memory is wired; past assessments for a property are used when `propertyId` is provided.

---

## Phase 6: Extensibility (Rail / Steel / Domains) ✅

**Location:** `AgentRunner` + API + UnifiedAIService.

| Deliverable | Status | Notes |
|-------------|--------|--------|
| Domain type | ✅ | `AssessmentDomain = 'building' \| 'rail' \| 'infrastructure' \| 'general'` in AgentRunner |
| Planner | ✅ | `planToolCalls` uses `getDamageTypesForDomain(input.domain ?? 'building')` |
| API | ✅ | Request schema `domain` (optional enum); placeholder and hybrid insert set `domain`; runAgent receives `domain` |
| UnifiedAIService | ✅ | `AnalysisContext.domain`; runAgent receives `context.domain ?? 'building'` |
| Taxonomy | ✅ | `damage_taxonomy` has `domain`; seed is building; rail/infrastructure can be added via migrations |

**Verdict:** Agent is domain-aware; rail/steel/infrastructure can be supported by seeding `damage_taxonomy` for those domains.

---

## Phase 7: Verification & Observability ✅

| Deliverable | Status | Notes |
|-------------|--------|--------|
| Verifier logging | ✅ | AgentRunner logs `Verifier result` with `assessmentId`, `aligned`, `needsReview` |
| Verification stats API | ✅ | GET `/api/building-surveyor/verification-stats` (admin) – `byStatus`, `total`, `needsReviewCount`, `needsReviewRatePercent`; optional `?days=30` |

**Location:** `apps/web/app/api/building-surveyor/verification-stats/route.ts`

---

## Minor Notes (Non-blocking)

1. **Duplicate retrieve_memory evidence:** `runToolSequenceAndWriteEvidence` runs all four tools (including retrieve_memory) and writes evidence for step 3. AgentRunner then runs `runRetrieveMemoryTool` again and writes evidence for step 3 again. Result: two evidence rows for step_index 3 for the same assessment. Functionally harmless but redundant; can be cleaned up by either removing retrieve_memory from the sequence and only running it in AgentRunner, or removing the second run/write in AgentRunner.
2. **UnifiedAIService placeholder severity:** Placeholder insert uses `severity: 'early'`. If your current `building_assessments.severity` is TEXT with CHECK ('early','midway','full'), this is correct. If the column was changed to integer elsewhere, this would need to match (e.g. 0 or a string enum).

---

## Conclusion

The Mint AI rebuild plan is **implemented through Phase 7**. Phases 1–3 (schema, tools, agent loop, API/UnifiedAIService) and the verifier are in place; Phases 4–7 add in-house VLM at generate, RAG via `property_id`, domain extensibility (rail/steel), and verification observability (logging + verification-stats endpoint).
