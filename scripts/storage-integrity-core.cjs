const { createHash } = require('node:crypto');
const SOURCES = [
  { table: 'job_attachments', column: 'file_url', bucket: 'Job-storage' },
  {
    table: 'assessment_images',
    column: 'image_url',
    bucket: 'assessment-photos',
  },
  { table: 'properties', column: 'photos', bucket: 'Job-storage' },
];

// Do not fetch external URLs or report signed tokens, home paths or raw row IDs.
function parseReference(raw, defaultBucket, projectUrl) {
  if (raw == null || raw === '') return { status: 'empty' };
  if (typeof raw !== 'string' || !raw.trim()) return { status: 'invalid' };
  let key = raw.trim();
  let bucket = defaultBucket;
  try {
    if (/^https?:\/\//i.test(key)) {
      const url = new URL(key);
      if (url.username || url.password) return { status: 'invalid' };
      if (url.origin !== new URL(projectUrl).origin)
        return { status: 'external' };
      if (url.hash) return { status: 'invalid' };
      key = url.pathname;
    } else if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(key)) {
      return { status: 'invalid' };
    }
    if (key.startsWith('/storage/v1/')) {
      const match = key.match(
        /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?.*)?$/
      );
      if (!match) return { status: 'invalid' };
      bucket = decodeURIComponent(match[1]);
      key = decodeURIComponent(match[2]);
    } else if (/^https?:\/\//i.test(raw.trim())) {
      return { status: 'invalid' };
    } else {
      key = key.replace(/^\/+/, '');
    }
    if (
      !bucket ||
      /[\/\\\x00-\x1f]/.test(bucket) ||
      /[\\\x00-\x1f]/.test(key) ||
      key.split('/').some((part) => !part || part === '.' || part === '..')
    )
      return { status: 'invalid' };
    return { status: 'storage', bucket, key };
  } catch {
    return { status: 'invalid' };
  }
}

async function lookupObject(client, bucket, key, pageSize, maxPages) {
  const slash = key.lastIndexOf('/');
  const folder = slash < 0 ? '' : key.slice(0, slash);
  const filename = key.slice(slash + 1);
  let offset = 0;
  for (let page = 0; page < maxPages; page++) {
    try {
      const { data, error } = await client.storage.from(bucket).list(folder, {
        limit: pageSize,
        offset,
        search: filename,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error || !Array.isArray(data)) return 'lookup_error';
      // A folder with the requested name is not an object.
      if (data.some((entry) => entry.name === filename && entry.id != null))
        return 'found';
      if (data.length === 0) return 'missing';
      offset += data.length;
    } catch {
      return 'lookup_error';
    }
  }
  return 'lookup_limit';
}

async function checkStorage(
  client,
  projectUrl,
  { pageSize = 500, maxPages = 100 } = {}
) {
  if (
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    !Number.isInteger(maxPages) ||
    maxPages < 1
  )
    throw new Error('Invalid bounds');
  new URL(projectUrl);
  const report = {
    generatedAt: new Date().toISOString(),
    complete: true,
    sources: {},
    findings: [],
  };
  for (const source of SOURCES) {
    const counts = {
      rows: 0,
      found: 0,
      missing: 0,
      lookup_error: 0,
      lookup_limit: 0,
      invalid: 0,
      external: 0,
      empty: 0,
      query_error: 0,
      query_limit: 0,
    };
    report.sources[source.table] = counts;
    let offset = 0;
    let finished = false;
    for (let page = 0; page < maxPages; page++) {
      let result;
      try {
        result = await client
          .from(source.table)
          .select(`id, ${source.column}`)
          .order('id', { ascending: true })
          .range(offset, offset + pageSize - 1);
      } catch {
        result = { error: true };
      }
      if (result.error || !Array.isArray(result.data)) {
        counts.query_error++;
        report.complete = false;
        finished = true;
        break;
      }
      if (result.data.length === 0) {
        finished = true;
        break;
      }
      counts.rows += result.data.length;
      offset += result.data.length;
      for (const row of result.data) {
        const value = row[source.column];
        const values =
          source.column === 'photos' && Array.isArray(value) ? value : [value];
        for (const [index, raw] of values.entries()) {
          const parsed =
            source.column === 'photos' && value != null && !Array.isArray(value)
              ? { status: 'invalid' }
              : parseReference(raw, source.bucket, projectUrl);
          const status =
            parsed.status === 'storage'
              ? await lookupObject(
                  client,
                  parsed.bucket,
                  parsed.key,
                  pageSize,
                  maxPages
                )
              : parsed.status;
          counts[status]++;
          if (['lookup_error', 'lookup_limit'].includes(status))
            report.complete = false;
          if (
            ['missing', 'invalid', 'lookup_error', 'lookup_limit'].includes(
              status
            )
          ) {
            report.findings.push({
              source: source.table,
              status,
              reference: createHash('sha256')
                .update(`${source.table}:${row.id}:${index}`)
                .digest('hex'),
            });
          }
        }
      }
    }
    if (!finished) {
      counts.query_limit++;
      report.complete = false;
    }
  }
  return report;
}
function reportExitCode(report) {
  if (!report.complete) return 2;
  return report.findings.length ? 1 : 0;
}
module.exports = { parseReference, lookupObject, checkStorage, reportExitCode };
