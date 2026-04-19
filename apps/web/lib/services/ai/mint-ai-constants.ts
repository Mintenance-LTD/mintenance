/**
 * Mint AI branding + attribution constants.
 *
 * "Mint AI" is the product-facing name for our fine-tuned vision-language
 * model used in the building damage assessment pipeline. It is a LoRA
 * fine-tune of Alibaba Cloud's Qwen2.5-VL-7B-Instruct base model.
 *
 * Attribution is required under the base model's Apache 2.0 license. Do
 * not remove this file or the comments that reference the base model —
 * any distribution of Mint AI weights or usage logs needs to retain this
 * attribution somewhere in the source tree (this file) and in the user-
 * facing model card under `/admin/mint-ai`.
 *
 * Versioning convention:
 *   MINT_AI_MODEL_ID    — stable product ID used in logs, cost tracking,
 *                         and `vlm_shadow_comparisons.student_model`.
 *                         Bump to `-v2`, `-v3` on retraining rounds.
 *   MINT_AI_BASE_MODEL  — the actual HuggingFace Hub ID. Never change
 *                         this unless you switch base architectures.
 */

export const MINT_AI_MODEL_ID = 'mint-ai-vlm-v1';

/** HuggingFace Hub identifier for the base model we fine-tune from. */
export const MINT_AI_BASE_MODEL_HF = 'Qwen/Qwen2.5-VL-7B-Instruct';

/** License of the base model — determines what our fine-tune can do. */
export const MINT_AI_BASE_MODEL_LICENSE = 'Apache-2.0';

/** Human-readable attribution line for model cards and about pages. */
export const MINT_AI_ATTRIBUTION =
  'Mint AI is based on Qwen2.5-VL-7B-Instruct by Alibaba Cloud, licensed under Apache 2.0.';
