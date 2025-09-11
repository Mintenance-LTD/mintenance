Husky Pre-Commit Hook Setup

This repo includes a pre-commit hook at `.husky/pre-commit` that runs a style guard to block hard-coded hex colors in React Native styles. To enable Husky hooks locally:

1) Install Husky as a dev dependency

   npm install --save-dev husky

2) Activate Husky in your repo (one-time)

   npx husky install

3) (Recommended) Add a prepare script to package.json so hooks are auto-enabled after install

   {
     "scripts": {
       "prepare": "husky install",
       "lint:hex": "node scripts/ci/check-no-hex.js"
     }
   }

4) Verify the hook runs

   - Make a commit that changes any file under `src/` and includes a hex color in a style line (e.g., `color: '#FF0000'`).
   - The commit should fail with a message pointing to the offending line.

CI Integration

This repo includes a GitHub Action at `.github/workflows/style-lint.yml` that runs the same check on PRs and pushes to main/master.

