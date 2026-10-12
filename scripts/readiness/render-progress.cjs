const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '../../audit/2026-10-04');
const progress = JSON.parse(fs.readFileSync(path.join(directory, 'readiness-progress.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const list = items => (items || []).map(item => `<li>${escape(item)}</li>`).join('');
const rows = progress.phases.map(phase => `<tr><td>${phase.id}. ${escape(phase.name)}</td><td>${escape(phase.status)}</td></tr>`).join('');
const releaseGates = (progress.releaseGates || []).map(gate => `<li><strong>${escape(gate.id)}: ${escape(gate.title)}</strong> — ${escape(gate.status)}. ${escape(gate.requirement)} <em>Tracked in phase ${escape(gate.phase)}.</em></li>`).join('');
const details = progress.phases.filter(phase => phase.completed || phase.remaining).map(phase => `
<section><h2>Phase ${phase.id}: ${escape(phase.name)}</h2>
<h3>Verified work</h3><ul>${list(phase.completed)}</ul>
<h3>Remaining</h3><ul>${list(phase.remaining)}</ul>
${phase.evidence ? `<p>Evidence: ${phase.evidence.map(file => `<a href="${escape(file)}">${escape(file)}</a>`).join(' · ')}</p>` : ''}</section>`).join('');
fs.writeFileSync(path.join(directory, 'readiness-progress.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product readiness progress</title>
<style>body{font:17px/1.6 system-ui;background:#f4f7fa;color:#172a3a;max-width:980px;margin:48px auto;padding:24px}h1{line-height:1.2}table{border-collapse:collapse;width:100%;background:white}th,td{padding:16px;text-align:left;border-bottom:1px solid #ddd}th{background:#e4eef4}section{margin-top:36px}a{color:#075b98}li{margin:8px 0}</style>
<h1>Product readiness progress</h1><p><strong>${escape(progress.releaseDecision)}</strong></p><p>${escape(progress.completionRule)}</p><p>Updated: ${escape(progress.updatedAt)}</p>
<table><tr><th>Phase</th><th>Status</th></tr>${rows}</table>${releaseGates ? `<section><h2>Open beta release gates</h2><p>Implementation completion does not clear these requirements for live users.</p><ul>${releaseGates}</ul></section>` : ''}${details}<p><a href="readiness-audit.html">Original audit</a> · <a href="readiness-progress.json">Machine-readable tracker</a></p></html>`);
console.log('Readiness tracker updated.');
