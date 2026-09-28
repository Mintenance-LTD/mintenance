/** Keep model-specific API parameters out of the surveying prompt. */
export function buildOpenAIAssessmentRequest(
  model: string,
  messages: unknown[],
  maxOutputTokens = 2000
) {
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1)
    throw new Error('Invalid assessment output token limit');
  const common = {
    model,
    messages,
    store: false,
    response_format: { type: 'json_object' as const },
  };
  if (/^gpt-6-/.test(model)) {
    const reasoning = /^gpt-6-astra(?:-|$)/.test(model) ? 'low' : 'none';
    return {
      ...common,
      max_completion_tokens: maxOutputTokens,
      reasoning_effort: reasoning,
      ...(reasoning === 'none' ? { temperature: 0.1 } : {}),
    };
  }
  return { ...common, max_tokens: maxOutputTokens, temperature: 0.1 };
}
