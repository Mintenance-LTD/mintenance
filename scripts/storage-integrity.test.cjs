const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseReference,
  lookupObject,
  checkStorage,
  reportExitCode,
} = require('./storage-integrity-core.cjs');
const origin = 'https://storage.example.test';
function client(
  rows = {},
  list = async () => ({ data: [], error: null }),
  queryError
) {
  return {
    storage: {
      from: (bucket) => ({
        list: (folder, options) => list(bucket, folder, options),
      }),
    },
    from: (table) => ({
      select: () => ({
        order: () => ({
          range: async (start, end) => {
            if (queryError) return queryError(table, start);
            return {
              data: (rows[table] || []).slice(start, end + 1),
              error: null,
            };
          },
        }),
      }),
    }),
  };
}
test('bare assessment paths use their source bucket, while explicit legacy URLs retain theirs', async () => {
  const calls = [];
  const c = client(
    {
      assessment_images: [
        { id: 'one', image_url: 'quick-ai/example/0.jpg' },
        {
          id: 'two',
          image_url: `${origin}/storage/v1/object/public/Job-storage/old.jpg`,
        },
      ],
    },
    async (bucket, folder, opts) => {
      calls.push([bucket, folder]);
      return { data: [{ name: opts.search, id: 'object' }] };
    }
  );
  const report = await checkStorage(c, origin);
  assert.deepEqual(calls, [
    ['assessment-photos', 'quick-ai/example'],
    ['Job-storage', ''],
  ]);
  assert.equal(report.sources.assessment_images.found, 2);
  assert.equal(reportExitCode(report), 0);
});
test('signed URLs decode only the key and discard tokens; invalid and external inputs are distinct', () => {
  assert.deepEqual(
    parseReference(
      `${origin}/storage/v1/object/sign/assessment-photos/a%20b.jpg?token=private`,
      'Job-storage',
      origin
    ),
    { status: 'storage', bucket: 'assessment-photos', key: 'a b.jpg' }
  );
  for (const value of [
    `${origin}/storage/v1/object/public/b/%ZZ`,
    'data:image/jpeg;base64,example',
    '//foreign/path',
    '../private',
    'a\\b',
    123,
    `${origin}/rest/v1/images`,
  ])
    assert.equal(
      parseReference(value, 'Job-storage', origin).status,
      'invalid'
    );
  assert.equal(
    parseReference(
      'https://other.example/storage/v1/object/public/b/a',
      'Job-storage',
      origin
    ).status,
    'external'
  );
});
test('listing paginates substring matches and excludes folders', async () => {
  const offsets = [];
  const c = client({}, async (_b, _f, o) => {
    offsets.push(o.offset);
    return {
      data:
        o.offset === 0
          ? [
              { name: 'photo.jpg', id: null },
              { name: 'photo.jpg.bak', id: 'other' },
            ]
          : [{ name: 'photo.jpg', id: 'real' }],
    };
  });
  assert.equal(await lookupObject(c, 'b', 'photo.jpg', 2, 3), 'found');
  assert.deepEqual(offsets, [0, 2]);
});
test('missing, service errors, thrown failures and bounds stay distinct', async () => {
  assert.equal(await lookupObject(client(), 'b', 'x', 2, 2), 'missing');
  assert.equal(
    await lookupObject(
      client({}, async () => ({ error: { message: 'private' } })),
      'b',
      'x',
      2,
      2
    ),
    'lookup_error'
  );
  assert.equal(
    await lookupObject(
      client({}, async () => {
        throw Error('private');
      }),
      'b',
      'x',
      2,
      2
    ),
    'lookup_error'
  );
  assert.equal(
    await lookupObject(
      client({}, async () => ({ data: [{ name: 'x', id: null }] })),
      'b',
      'x',
      2,
      2
    ),
    'lookup_limit'
  );
});
test('database pagination includes later rows and query failures cannot report success', async () => {
  const report = await checkStorage(
    client({
      job_attachments: [
        { id: '1', file_url: 'x' },
        { id: '2', file_url: 'y' },
        { id: '3', file_url: 'z' },
      ],
    }),
    origin,
    { pageSize: 2, maxPages: 5 }
  );
  assert.equal(report.sources.job_attachments.rows, 3);
  assert.equal(report.sources.job_attachments.missing, 3);
  assert.equal(reportExitCode(report), 1);
  for (const response of [{ error: true }, { data: null }]) {
    const failed = await checkStorage(
      client({}, undefined, async () => response),
      origin
    );
    assert.equal(failed.complete, false);
    assert.equal(reportExitCode(failed), 2);
  }
});
test('partial queries and bounded traversal retain findings but mark coverage incomplete', async () => {
  const c = client({}, undefined, async (table, start) =>
    table !== 'job_attachments'
      ? { data: [] }
      : start === 0
        ? { data: [{ id: 'private-row', file_url: 'private-path' }] }
        : { error: true }
  );
  const report = await checkStorage(c, origin, { pageSize: 1, maxPages: 3 });
  assert.equal(report.sources.job_attachments.missing, 1);
  assert.equal(report.sources.job_attachments.query_error, 1);
  assert.equal(reportExitCode(report), 2);
  const bounded = await checkStorage(
    client({ job_attachments: [{ id: 'x', file_url: 'a' }] }),
    origin,
    { pageSize: 1, maxPages: 1 }
  );
  assert.equal(bounded.sources.job_attachments.query_limit, 1);
  assert.equal(reportExitCode(bounded), 2);
});
test('report redacts private references and errors, with separate skipped/invalid property counts', async () => {
  const secret = 'DO-NOT-REPORT-THIS';
  const c = client(
    {
      properties: [
        {
          id: secret,
          photos: [
            `${origin}/storage/v1/object/sign/b/${secret}?token=${secret}`,
            'https://external.example/a',
            null,
            123,
          ],
        },
        { id: 'bad', photos: { url: 'x' } },
      ],
    },
    async () => ({ error: { message: secret } })
  );
  const report = await checkStorage(c, origin);
  assert.equal(report.sources.properties.lookup_error, 1);
  assert.equal(report.sources.properties.external, 1);
  assert.equal(report.sources.properties.empty, 1);
  assert.equal(report.sources.properties.invalid, 2);
  assert.equal(JSON.stringify(report).includes(secret), false);
  assert.equal(reportExitCode(report), 2);
});
test('report artifact is not hidden and CI runs the offline regressions', () => {
  const fs = require('node:fs');
  const workflow = fs.readFileSync(
    '.github/workflows/storage-integrity.yml',
    'utf8'
  );
  assert.match(workflow, /path: scripts\/storage-integrity-report\.json/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(
    fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8'),
    /node --test scripts\/storage-integrity\.test\.cjs/
  );
});
