// Build script for Vercel — replaces bash to avoid CRLF issues on Windows
// Uses execSync with hardcoded commands only (no user input, no injection risk)
const { execSync } = require('child_process');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: opts.cwd });
  } catch (e) {
    if (opts.allowFailure) {
      console.log(`WARN: "${cmd}" failed (non-fatal)`);
    } else {
      process.exit(e.status || 1);
    }
  }
}

console.log('=== Mintenance Build ===');
console.log('=== Cleaning stale dist directories ===');
run(
  'rm -rf packages/shared/dist packages/shared/tsconfig.tsbuildinfo packages/types/dist packages/types/tsconfig.tsbuildinfo packages/api-contracts/dist packages/api-contracts/tsconfig.tsbuildinfo packages/api-client/dist packages/api-client/tsconfig.tsbuildinfo packages/auth/dist packages/auth/tsconfig.tsbuildinfo packages/design-tokens/dist packages/design-tokens/tsconfig.tsbuildinfo packages/security/dist packages/security/tsconfig.tsbuildinfo packages/shared-ui/dist packages/shared-ui/tsconfig.tsbuildinfo',
  { allowFailure: true }
);
console.log('=== Building shared packages ===');
run('npm run build --workspace=packages/shared --if-present', {
  allowFailure: true,
});
run('npm run build --workspace=packages/types --if-present', {
  allowFailure: true,
});
run('npm run build --workspace=packages/api-contracts --if-present', {
  allowFailure: true,
});
run('npm run build --workspace=packages/api-client --if-present', {
  allowFailure: true,
});
run('npm run build --workspace=packages/auth --if-present', {
  allowFailure: true,
});
run('npm run build --workspace=packages/design-tokens --if-present', {
  allowFailure: true,
});
run('npm run build --workspace=packages/security --if-present', {
  allowFailure: true,
});
run('npm run build --workspace=packages/shared-ui --if-present', {
  allowFailure: true,
});

console.log('=== Copying public assets for Vercel ===');
run('cp -r apps/web/public ./public', { allowFailure: true });

console.log('=== Type-checking web app ===');
run('npx tsc --noEmit', { cwd: 'apps/web', allowFailure: true });

console.log('=== Linting web app ===');
run('npx eslint . --max-warnings 5000', {
  cwd: 'apps/web',
  allowFailure: true,
});

console.log('=== Building Next.js app ===');
run('npx next build', { cwd: 'apps/web' });
