const { execFileSync } = require('node:child_process');
const { appendFileSync } = require('node:fs');

// Test and documentation edits still run validation, but do not change a
// native binary. Unknown files within a runtime root conservatively build.
function requiresNativeBuild(paths) {
  return paths.some((file) => {
    if (/^(package\.json|package-lock\.json)$/.test(file)) return true;
    if (!/^(apps\/mobile\/|packages\/|tools\/eas-cli\/)/.test(file))
      return false;
    if (/(^|\/)(__tests__|__mocks__|e2e)\//.test(file)) return false;
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) return false;
    if (/\.(md|snap)$/.test(file)) return false;
    if (/(^|\/)(jest[.-]|vitest\.config|playwright\.config)/.test(file))
      return false;
    return true;
  });
}

if (require.main === module) {
  const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const paths = manual
    ? []
    : execFileSync(
        'git',
        [
          'diff',
          '--name-only',
          '--no-renames',
          '-z',
          process.env.BASE_SHA,
          process.env.HEAD_SHA,
        ],
        { encoding: 'utf8' }
      )
        .split('\0')
        .filter(Boolean);
  const shouldBuild = manual || requiresNativeBuild(paths);
  appendFileSync(process.env.GITHUB_OUTPUT, `should-build=${shouldBuild}\n`);
  console.log(
    shouldBuild
      ? 'Native build inputs changed (or manual build requested).'
      : 'No native binary changes; EAS build skipped, validation remains enabled.'
  );
}

module.exports = { requiresNativeBuild };
