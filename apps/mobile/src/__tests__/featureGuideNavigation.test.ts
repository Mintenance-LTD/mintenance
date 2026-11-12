import fs from 'node:fs';
import path from 'node:path';
import { FEATURE_GUIDES } from '@mintenance/shared';

// Native source is deliberately omitted from web-only deployment uploads.
// Keep this cross-package contract in the mandatory mobile test suite.
it('native guide destinations are registered in the profile navigator', () => {
  const navigator = fs.readFileSync(
    path.resolve(__dirname, '../navigation/navigators/ProfileNavigator.tsx'),
    'utf8'
  );
  for (const guide of FEATURE_GUIDES) {
    if (guide.mobileScreen) {
      expect(navigator).toContain(`name='${guide.mobileScreen}'`);
    }
  }
});
