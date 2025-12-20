# Phase 5: Testing & Validation - Execution Guide

## Quick Start

### Prerequisites
1. Ensure all packages are built:
   ```bash
   npm run build:packages
   ```

2. The web app will start automatically via Playwright's webServer config

### Running Visual Regression Tests

#### Option 1: Run all visual tests
```bash
npm run e2e e2e/visual/visual-regression.spec.js
```

#### Option 2: Run with UI (recommended for first run)
```bash
npm run e2e:ui e2e/visual/visual-regression.spec.js
```

#### Option 3: Run specific test
```bash
npx playwright test e2e/visual/visual-regression.spec.js -g "homepage desktop"
```

### Understanding Test Results

#### ✅ Pass
- Screenshot matches baseline (within 1% tolerance)
- No visual regressions detected

#### ❌ Fail
- Screenshot differs from baseline (>1% difference)
- Review the diff image in `test-results/` folder
- Check if difference is expected or a regression

#### ⚠️ Missing Baseline
- First time running tests
- Baseline screenshots need to be captured first
- Run baseline capture: `npm run e2e e2e/visual/baseline-capture.visual.spec.js`

### Updating Baselines (if needed)

If visual changes are intentional and approved:
```bash
npx playwright test e2e/visual/visual-regression.spec.js --update-snapshots
```

**⚠️ Warning**: Only update baselines if changes are intentional!

### Test Coverage

#### Pages Tested
- ✅ Homepage (desktop, mobile, tablet, wide)
- ✅ Login page
- ⏳ Register page (if baseline exists)
- ⏳ Dashboard pages (requires auth setup)

#### Components Tested
- ✅ Button component
- ✅ Input component
- ✅ Card component
- ⏳ Badge component (if visible on tested pages)

### Troubleshooting

#### Tests fail with "Element not found"
- Page may have changed structure
- Update selectors in test file
- Check if element exists before asserting

#### Tests fail with "Screenshot mismatch"
- Review diff image
- Check if difference is expected
- Verify component migration didn't introduce visual changes
- Check browser/OS differences

#### Server not starting
- Check if port 3000 is available
- Verify web app builds successfully
- Check for errors in webServer logs

### Next Steps After Tests

1. **If tests pass**: Proceed with component functionality testing
2. **If tests fail**: 
   - Review differences
   - Fix any regressions
   - Re-run tests
   - Update baselines only if changes are intentional

3. **Document results**: Update `docs/PHASE5_PROGRESS.md` with test results

### Manual Testing Checklist

After visual regression tests pass:

- [ ] Button clicks work correctly
- [ ] Input fields accept input
- [ ] Forms submit correctly
- [ ] Cards display content correctly
- [ ] Badges show correct status
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Components responsive on mobile
- [ ] Keyboard navigation works
- [ ] Focus states visible

