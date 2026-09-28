import { buildOpenAIAssessmentRequest } from './openai-request';

describe('OpenAI vision request compatibility', () => {
  it('preserves GPT-4o sampling and explicitly disables response storage', () => {
    expect(buildOpenAIAssessmentRequest('gpt-4o', [])).toMatchObject({
      max_tokens: 2000,
      temperature: 0.1,
      store: false,
    });
  });
  it('uses supported token and reasoning settings for GPT-6 Sol', () => {
    const r = buildOpenAIAssessmentRequest('gpt-6-sol', []);
    expect(r).toMatchObject({
      max_completion_tokens: 2000,
      reasoning_effort: 'none',
    });
    expect(r).not.toHaveProperty('max_tokens');
  });
  it('does not send sampling temperature or none reasoning to Astra', () => {
    const r = buildOpenAIAssessmentRequest('gpt-6-astra', [], 6000);
    expect(r).toMatchObject({
      max_completion_tokens: 6000,
      reasoning_effort: 'low',
    });
    expect(r).not.toHaveProperty('temperature');
  });
});
