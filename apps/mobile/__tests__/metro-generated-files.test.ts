import fs from 'fs';
import path from 'path';
import vm from 'vm';

it('excludes generated files and duplicate checkouts without excluding mobile dependencies', () => {
  const mobile = path.resolve(__dirname, '..');
  const root = path.resolve(mobile, '../..');
  const existing = /existing-exclusion/;
  const result = {
    exports: {} as {
      watchFolders: string[];
      resolver: { blockList: RegExp[] };
    },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(mobile, 'metro.config.js'), 'utf8'),
    {
      __dirname: mobile,
      module: result,
      require: (name: string) =>
        name === 'path'
          ? path
          : {
              getDefaultConfig: () => ({ resolver: { blockList: [existing] } }),
            },
    }
  );
  const blocked = (relative: string) =>
    result.exports.resolver.blockList.some((pattern) =>
      pattern.test(path.join(root, relative))
    );
  expect(result.exports.watchFolders).toEqual([
    path.join(root, 'packages'),
    path.join(root, 'node_modules'),
  ]);
  for (const name of [
    'audit',
    'audit/local/db.ts',
    '.pnpm-store/cache',
    '.next/server',
    '.claude/worktrees/copy/apps/mobile/index.ts',
  ]) {
    expect(blocked(name)).toBe(true);
  }
  for (const name of [
    'apps/mobile/index.ts',
    'packages/shared/src/index.ts',
    'node_modules/expo/package.json',
    'apps/mobile/src/audit/index.ts',
  ]) {
    expect(blocked(name)).toBe(false);
  }
  expect(result.exports.resolver.blockList).toContain(existing);
});
