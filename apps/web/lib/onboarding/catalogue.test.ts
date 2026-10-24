import { expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  FEATURE_GUIDES,
  PERSONA_LABELS,
  guidesForPersona,
  onboardingPersonas,
  earlyAccessBenefits,
} from '@mintenance/shared';
function pages(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? pages(path.join(dir, entry.name))
        : entry.name === 'page.tsx'
          ? [path.join(dir, entry.name)]
          : []
    );
}
it('every guide links to an existing web feature route', () => {
  const app = path.resolve('app');
  const routes = pages(app).map(
    (file) =>
      '/' +
      path
        .relative(app, path.dirname(file))
        .split(path.sep)
        .filter((segment) => !segment.startsWith('('))
        .join('/')
  );
  expect(
    FEATURE_GUIDES.filter((guide) => !routes.includes(guide.href)).map(
      (g) => g.href
    )
  ).toEqual([]);
});
it('every educational persona has distinct relevant guidance without changing permissions', () => {
  for (const persona of Object.keys(
    PERSONA_LABELS
  ) as (keyof typeof PERSONA_LABELS)[])
    expect(guidesForPersona(persona).length).toBeGreaterThan(2);
  expect(onboardingPersonas('admin')).toEqual(['admin']);
  expect(onboardingPersonas('contractor')).not.toContain('landlord');
  expect(guidesForPersona('tenant').some((g) => g.id === 'business')).toBe(
    false
  );
  expect(guidesForPersona('team-member').some((g) => g.id === 'payouts')).toBe(
    false
  );
});
it('native guide destinations are registered in the profile navigator', () => {
  const navigator = fs.readFileSync(
    path.resolve('../mobile/src/navigation/navigators/ProfileNavigator.tsx'),
    'utf8'
  );
  for (const guide of FEATURE_GUIDES)
    if (guide.mobileScreen)
      expect(navigator).toContain(`name='${guide.mobileScreen}'`);
});
it('homeowner benefits never include contractor fees or lifetime claims', () => {
  expect(JSON.stringify(earlyAccessBenefits('homeowner', '5%'))).not.toMatch(
    /5%|platform fee|lifetime/i
  );
  expect(JSON.stringify(earlyAccessBenefits('contractor', '6.5%'))).toContain(
    '6.5%'
  );
  expect(new Set(FEATURE_GUIDES.map((g) => g.id)).size).toBe(
    FEATURE_GUIDES.length
  );
});
