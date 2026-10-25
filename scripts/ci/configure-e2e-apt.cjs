const fs = require('node:fs');
const path = require('node:path');

// Keep Ubuntu's suites, components and signature/keyring settings intact. Only
// replace the Azure mirror that repeatedly stalled our hosted E2E runners.
function useUbuntuArchive(source) {
  return source.replace(
    /(^|\s)https?:\/\/azure\.archive\.ubuntu\.com\/ubuntu\/?(?=\s|$)/gm,
    '$1https://archive.ubuntu.com/ubuntu/'
  );
}

const downloadPolicy = [
  'Acquire::Retries "3";',
  'Acquire::http::Timeout "30";',
  'Acquire::https::Timeout "30";',
  '',
].join('\n');

function configureApt(aptDirectory) {
  const sourcesDirectory = path.join(aptDirectory, 'sources.list.d');
  // Current hosted images use mirror+file sources. Rewriting only the .sources
  // file leaves the Azure URL in this mirror list active.
  const sourceFiles = [
    path.join(aptDirectory, 'sources.list'),
    path.join(aptDirectory, 'apt-mirrors.txt'),
  ];
  if (fs.existsSync(sourcesDirectory)) {
    for (const entry of fs.readdirSync(sourcesDirectory, {
      withFileTypes: true,
    })) {
      if (entry.isFile() && /\.(list|sources)$/.test(entry.name)) {
        sourceFiles.push(path.join(sourcesDirectory, entry.name));
      }
    }
  }

  let changed = 0;
  for (const file of sourceFiles) {
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) continue;
    const before = fs.readFileSync(file, 'utf8');
    const after = useUbuntuArchive(before);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed += 1;
    }
  }
  fs.writeFileSync(
    // Hosted images also ship zz-retries; our policy must sort after it.
    path.join(aptDirectory, 'apt.conf.d', 'zzzz-e2e-downloads'),
    downloadPolicy
  );
  return changed;
}

if (require.main === module) {
  if (process.platform !== 'linux' || process.getuid() !== 0) {
    throw new Error(
      'Run this setup with sudo on the disposable Ubuntu E2E runner.'
    );
  }
  const changed = configureApt('/etc/apt');
  console.log(
    `Configured bounded APT downloads; switched ${changed} source file(s) to Ubuntu's primary archive.`
  );
}

module.exports = { configureApt, useUbuntuArchive, downloadPolicy };
