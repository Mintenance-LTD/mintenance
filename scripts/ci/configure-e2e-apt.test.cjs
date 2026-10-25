const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  configureApt,
  useUbuntuArchive,
  downloadPolicy,
} = require('./configure-e2e-apt.cjs');

test('rewrites legacy sources while preserving suite, components and trust options', () => {
  const input =
    'deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] http://azure.archive.ubuntu.com/ubuntu noble main restricted\n';
  assert.equal(
    useUbuntuArchive(input),
    input.replace(
      'http://azure.archive.ubuntu.com/ubuntu',
      'https://archive.ubuntu.com/ubuntu/'
    )
  );
});

test('rewrites Noble deb822 sources without changing security repositories or keyrings', () => {
  const input =
    'Types: deb\nURIs: http://azure.archive.ubuntu.com/ubuntu/\nSuites: noble noble-updates noble-backports\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n\nTypes: deb\nURIs: http://security.ubuntu.com/ubuntu/\nSuites: noble-security\n';
  assert.equal(
    useUbuntuArchive(input),
    input.replace(
      'http://azure.archive.ubuntu.com/ubuntu/',
      'https://archive.ubuntu.com/ubuntu/'
    )
  );
});

test('accepts HTTPS, multiple URI fields and CRLF without modifying other URLs', () => {
  const input =
    'URIs: https://azure.archive.ubuntu.com/ubuntu https://mirror.example/ubuntu/\r\n';
  assert.equal(
    useUbuntuArchive(input),
    'URIs: https://archive.ubuntu.com/ubuntu/ https://mirror.example/ubuntu/\r\n'
  );
});

test('leaves primary, third-party and lookalike repositories unchanged', () => {
  const input = [
    'https://archive.ubuntu.com/ubuntu/',
    'https://packages.microsoft.com/ubuntu/24.04/prod',
    'https://azure.archive.ubuntu.com.evil.example/ubuntu',
    'https://azure.archive.ubuntu.com/ubuntu-other',
  ].join('\n');
  assert.equal(useUbuntuArchive(input), input);
});

test('updates only active source files and writes bounded policy idempotently', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-apt-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'sources.list.d'));
  fs.mkdirSync(path.join(root, 'apt.conf.d'));
  const source = 'deb http://azure.archive.ubuntu.com/ubuntu/ noble main\n';
  for (const name of [
    'sources.list',
    'sources.list.d/ubuntu.sources',
    'sources.list.d/ubuntu.list',
    'sources.list.d/ubuntu.sources.backup',
  ]) {
    fs.writeFileSync(path.join(root, name), source);
  }
  assert.equal(configureApt(root), 3);
  assert.equal(configureApt(root), 0);
  assert.equal(
    fs.readFileSync(path.join(root, 'sources.list'), 'utf8'),
    useUbuntuArchive(source)
  );
  assert.equal(
    fs.readFileSync(
      path.join(root, 'sources.list.d/ubuntu.sources.backup'),
      'utf8'
    ),
    source
  );
  assert.equal(
    fs.readFileSync(path.join(root, 'apt.conf.d/99-e2e-downloads'), 'utf8'),
    downloadPolicy
  );
  assert.match(downloadPolicy, /Acquire::Retries "3";/);
  assert.match(downloadPolicy, /Acquire::https::Timeout "30";/);
  assert.doesNotMatch(
    downloadPolicy,
    /AllowInsecure|AllowUnauthenticated|Verify-Peer/
  );
});

test('surfaces filesystem failures instead of claiming successful setup', () => {
  assert.throws(
    () =>
      configureApt(
        path.join(os.tmpdir(), 'missing-apt-directory-' + process.pid)
      ),
    /ENOENT/
  );
});
