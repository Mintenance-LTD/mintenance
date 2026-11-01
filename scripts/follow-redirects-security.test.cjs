'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const vm = require('node:vm');
const { once } = require('node:events');
const { createRequire } = require('node:module');
const path = require('node:path');
const dependency = process.env.SECURITY_TEST_MODULE_ROOT
  ? createRequire(
      path.resolve(process.env.SECURITY_TEST_MODULE_ROOT, 'package.json')
    )
  : require;
const redirects = dependency('follow-redirects');

test('every locked follow-redirects copy is the reviewed fix', () => {
  const copies = Object.entries(
    require('../package-lock.json').packages
  ).filter(([name]) => name.endsWith('/follow-redirects'));
  assert.ok(copies.length > 0);
  for (const [, pkg] of copies) assert.equal(pkg.version, '1.16.2');
});

for (const crossRealm of [false, true]) {
  for (const sameOrigin of [false, true]) {
    test(
      `sensitive headers: ${crossRealm ? 'cross' : 'same'} realm, ${sameOrigin ? 'same' : 'cross'} origin`,
      { timeout: 5000 },
      async (t) => {
        let seen;
        const target = http.createServer((req, res) => {
          seen = req.headers;
          res.end('ok');
        });
        target.listen(0, '127.0.0.1');
        await once(target, 'listening');
        t.after(() => {
          target.closeAllConnections();
          target.close();
        });
        const origin = http.createServer((req, res) => {
          if (req.url === '/done') {
            seen = req.headers;
            res.end('ok');
          } else {
            res.writeHead(302, {
              Location: `http://127.0.0.1:${sameOrigin ? originPort : target.address().port}/done`,
            });
            res.end();
          }
        });
        origin.listen(0, '127.0.0.1');
        await once(origin, 'listening');
        const originPort = origin.address().port;
        t.after(() => {
          origin.closeAllConnections();
          origin.close();
        });
        const sensitiveHeaders = crossRealm
          ? vm.runInNewContext("['X-API-Key']")
          : ['X-API-Key'];
        assert.equal(Array.isArray(sensitiveHeaders), true);
        assert.equal(sensitiveHeaders instanceof Array, !crossRealm);
        await new Promise((resolve, reject) => {
          const req = redirects.http.get(
            {
              hostname: '127.0.0.1',
              port: originPort,
              path: '/',
              sensitiveHeaders,
              headers: {
                'X-API-Key': 'synthetic-secret',
                'X-Harmless': 'retained',
                Authorization: 'synthetic-auth',
                Cookie: 'synthetic-cookie=1',
              },
            },
            (res) => {
              res.resume();
              res.on('end', resolve);
              res.on('error', reject);
            }
          );
          req.on('error', reject);
          req.setTimeout(2000, () =>
            req.destroy(new Error('loopback timeout'))
          );
        });
        assert.equal(seen['x-harmless'], 'retained');
        assert.equal(
          seen['x-api-key'],
          sameOrigin ? 'synthetic-secret' : undefined
        );
        assert.equal(
          seen.authorization,
          sameOrigin ? 'synthetic-auth' : undefined
        );
        assert.equal(
          seen.cookie,
          sameOrigin ? 'synthetic-cookie=1' : undefined
        );
      }
    );
  }
}
