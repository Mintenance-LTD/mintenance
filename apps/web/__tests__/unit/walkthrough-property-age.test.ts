// @vitest-environment node
/**
 * Property age reaching the surveyor.
 *
 * A kitchen with `year_built = 2026` was surveyed as having established mould
 * growth and structural movement. The model was not wrong to consider them —
 * it had never been told the building was finished that year, because the phone
 * sends `context = { room }` and nothing else.
 *
 * Age 0 is the whole point and it is also the value most likely to be dropped:
 * every `if (age)` in the chain treats a property built this year as unknown.
 * These pin the arithmetic and the two falsy guards that used to swallow it.
 */
import {
  ageFromYearBuilt,
  normalisePropertyType,
} from '@/app/api/assessments/walkthrough/property-age';
import {
  buildSystemPrompt,
  buildUserPrompt,
} from '@/lib/services/building-surveyor/prompt-builder';

const NOW = new Date('2026-07-29T12:00:00Z');

describe('ageFromYearBuilt', () => {
  it('reports 0 for a property built this year', () => {
    // Not undefined, not falsy-blank — a real age of zero.
    expect(ageFromYearBuilt(2026, NOW)).toBe(0);
  });

  it('treats an off-plan future build year as a new build, not a negative age', () => {
    expect(ageFromYearBuilt(2028, NOW)).toBe(0);
  });

  it('computes ordinary ages', () => {
    expect(ageFromYearBuilt(2020, NOW)).toBe(6);
    expect(ageFromYearBuilt(1890, NOW)).toBe(136);
  });

  it('refuses a missing year rather than inventing one', () => {
    expect(ageFromYearBuilt(null, NOW)).toBeUndefined();
    expect(ageFromYearBuilt(undefined, NOW)).toBeUndefined();
  });

  it('refuses sentinel and truncated years', () => {
    // 0 and two-digit years are how this column goes wrong in practice; an age
    // of 2026 years would otherwise be handed to the surveyor as fact.
    expect(ageFromYearBuilt(0, NOW)).toBeUndefined();
    expect(ageFromYearBuilt(98, NOW)).toBeUndefined();
    expect(ageFromYearBuilt(-1900, NOW)).toBeUndefined();
  });

  it('refuses non-finite values', () => {
    expect(ageFromYearBuilt(NaN, NOW)).toBeUndefined();
    expect(ageFromYearBuilt(Infinity, NOW)).toBeUndefined();
  });
});

describe('normalisePropertyType', () => {
  it('maps the stored text onto the surveyor enum', () => {
    expect(normalisePropertyType('residential')).toBe('residential');
    expect(normalisePropertyType('  Commercial ')).toBe('commercial');
  });

  it('drops a value it does not recognise instead of guessing', () => {
    // The column is free text; coercing 'bungalow' to 'residential' would be a
    // guess dressed as data.
    expect(normalisePropertyType('bungalow')).toBeUndefined();
    expect(normalisePropertyType('')).toBeUndefined();
    expect(normalisePropertyType(null)).toBeUndefined();
  });
});

describe('the prompt actually receives age 0', () => {
  it('states a zero age in the user prompt', () => {
    // Previously `if (context?.ageOfProperty)` — falsy at 0, so the newest
    // buildings were the only ones whose age was never mentioned.
    const prompt = buildUserPrompt({ ageOfProperty: 0 });
    expect(prompt).toContain('Property Age: 0 years');
    expect(prompt).toContain('new build');
  });

  it('still states ordinary ages', () => {
    expect(buildUserPrompt({ ageOfProperty: 136 })).toContain(
      'Property Age: 136 years'
    );
  });

  it('says nothing when the age is genuinely unknown', () => {
    expect(buildUserPrompt({})).not.toContain('Property Age');
  });

  it('gives new-build guidance in the system prompt at age 0', () => {
    // Previously `!ageOfProperty || ageOfProperty <= 0` returned '' — the
    // guidance was withheld from exactly the properties that needed it.
    const prompt = buildSystemPrompt(undefined, 0);
    expect(prompt).toContain('NEW BUILD');
    expect(prompt).toMatch(/implausible/i);
  });

  it('gives new-build guidance for a 2-year-old property', () => {
    expect(buildSystemPrompt(undefined, 2)).toContain('NEW BUILD');
  });

  it('switches to era risks once the property is past drying out', () => {
    const prompt = buildSystemPrompt(undefined, 40);
    expect(prompt).not.toContain('NEW BUILD');
    expect(prompt).toContain('ERA-SPECIFIC RISK ASSESSMENT');
  });

  it('names mould and structural movement as the implausible ones on a new build', () => {
    // The two findings the real survey produced on a same-year kitchen.
    const prompt = buildSystemPrompt(undefined, 0);
    expect(prompt).toMatch(/mould/i);
    expect(prompt).toMatch(/subsidence|structural/i);
  });

  it('tells the model a clean new build is an acceptable answer', () => {
    // Otherwise "report EVERY defect" pressure fills the gap with something.
    expect(buildSystemPrompt(undefined, 0)).toMatch(
      /nothing wrong is a normal and correct survey outcome/i
    );
  });

  it('adds no age section when the age is unknown', () => {
    const prompt = buildSystemPrompt(undefined, undefined);
    expect(prompt).not.toContain('NEW BUILD');
    expect(prompt).not.toContain('ERA-SPECIFIC RISK ASSESSMENT');
  });
});
