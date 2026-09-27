/** Build reproducible pixel-degradation stress cases and a local review gallery. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(process.argv[2] ?? '.vercel/mint-eval/pilot');
const originals = JSON.parse(await fs.readFile(path.join(root, 'originals.json'), 'utf8'));
if (originals.length !== 160) throw new Error('Expected exactly 160 original cases');
const rank = (id) => createHash('sha256').update(`mint-stress-v1:${id}`).digest('hex');
const parents = [true, false].flatMap(label => originals.filter(r => r.crack_present === label)
  .sort((a,b) => rank(a.id).localeCompare(rank(b.id))).slice(0,20));
const rows = [...originals];
for (const [i, parent] of parents.entries()) {
  const mode = ['dark', 'overexposed', 'blurred', 'low_resolution'][i % 4];
  const id = `stress-${String(i+1).padStart(3,'0')}`;
  let transform = sharp(path.join(root,parent.image));
  if (mode === 'dark') transform = transform.linear(0.015,0);
  if (mode === 'overexposed') transform = transform.linear(0.015,251);
  if (mode === 'blurred') transform = transform.blur(18);
  if (mode === 'low_resolution') {
    const reduced = await transform.resize(8,8,{fit:'fill'}).png().toBuffer();
    transform = sharp(reduced).resize(256,256,{kernel:'nearest'});
  }
  const image = `images/${id}.png`;
  const bytes = await transform.png().toBuffer();
  await fs.writeFile(path.join(root,image),bytes);
  rows.push({...parent,id,image,sha256:createHash('sha256').update(bytes).digest('hex'),
    cohort:'degraded',parent_id:parent.id,source_crack_present:parent.crack_present,
    crack_present:null,transformation:mode,
    transformation_parameters:{dark:'pixel*0.015',overexposed:'pixel*0.015+251',blurred:'gaussian sigma 18',low_resolution:'8x8 then nearest-neighbour 256x256'}[mode],
    label_basis:'Synthetic stress case; visible crack label and assessability need human review',
    review_status:'pending_human_review',expected_outcome:null});
}
const hashes = new Set();
for (const row of rows) {
  const bytes = await fs.readFile(path.join(root,row.image));
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== 256 || metadata.height !== 256) throw new Error(`Unexpected image dimensions: ${row.id}`);
  if (createHash('sha256').update(bytes).digest('hex') !== row.sha256) throw new Error(`Hash mismatch: ${row.id}`);
  hashes.add(row.sha256);
}
if (hashes.size !== 200) throw new Error('Duplicate output image bytes found');
await fs.writeFile(path.join(root,'manifest.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
await fs.writeFile(path.join(root,'exclude-from-training.json'),JSON.stringify({
  dataset:'SDNET2018',split:'evaluation_only',
  source_groups:[...new Set(rows.map(r=>r.source_group))].sort(),
  sha256:[...hashes].sort(),
  instruction:'Exclude these entire source-photograph groups, crops and derivatives from future SDNET training ingestion. This file is an exclusion manifest, not proof of exclusion from existing pretrained models.'
},null,2));
const csv = ['id,image,cohort,source_group,crack_present,assessable,reviewer,notes',
  ...rows.map(r=>`${r.id},${r.image},${r.cohort},${r.source_group},${r.crack_present??''},,,`)];
try {
  await fs.writeFile(path.join(root,'review.csv'),csv.join('\n')+'\n',{flag:'wx'});
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Keeping existing review.csv so human annotations are preserved.');
}
const cards = rows.map(r=>`<article data-cohort="${r.cohort}"><img loading="lazy" src="${r.image}" alt="${r.id}"><h2>${r.id}</h2><p>${r.surface} · ${r.cohort}${r.transformation?' · '+r.transformation:''}</p><details><summary>Reference label / provenance</summary><p>${r.crack_present===null?'Assessability and visible defect label awaiting review':r.crack_present?'Publisher label: crack':'Publisher label: no crack (not a safety finding)'}</p><p>Source: ${r.source_archive_member}<br>Group: ${r.source_group}</p></details></article>`).join('\n');
await fs.writeFile(path.join(root,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Mint AI — 200-image evaluation pilot</title><style>body{font:16px system-ui;margin:32px;background:#f4f7f5;color:#173d35}header{max-width:1000px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}article{background:white;padding:16px;border:1px solid #ccd8d1;border-radius:12px}img{width:256px;max-width:100%;image-rendering:auto}h2{font-size:18px}button{padding:10px;margin:8px 8px 20px 0}details{font-size:13px}footer{margin-top:32px}</style><header><h1>Mint AI evaluation pilot</h1><p>200 images: 80 cracked, 80 non-cracked, 40 degraded. Evaluation only. Model evaluations are reported separately.</p><p>Labels describe visible cracks, not structural safety. The degraded images need human assessment before scoring. Expand each card to reveal its reference label.</p><button onclick="filter('all')">All 200</button><button onclick="filter('original')">Originals 160</button><button onclick="filter('degraded')">Degraded 40</button><p><a href="review.csv">Review worksheet</a> · <a href="manifest.jsonl">Case manifest</a> · <a href="provenance.json">Provenance</a></p></header><main>${cards}</main><footer>SDNET2018: Maguire, Dorafshan &amp; Thomas (2018), Utah State University. <a href="https://doi.org/10.15142/T3TD19">Original dataset</a>. <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Downloaded via public Kaggle mirror. Degradations by Mintenance for evaluation; authors do not endorse this project.</footer><script>function filter(c){document.querySelectorAll('article').forEach(e=>e.hidden=c!=='all'&&e.dataset.cohort!==c)}</script></html>`);
// A compact inspection sheet: 8 examples from each original class and each degradation.
const examples = [true,false].flatMap(label=>originals.filter(r=>r.crack_present===label).slice(0,8));
for (const mode of ['dark','overexposed','blurred','low_resolution']) examples.push(...rows.filter(r=>r.transformation===mode).slice(0,8));
const tiles = await Promise.all(examples.map(async(r,i)=>({input:await sharp(path.join(root,r.image)).resize(128,128).png().toBuffer(),left:(i%8)*128,top:Math.floor(i/8)*128})));
await sharp({create:{width:1024,height:768,channels:3,background:'white'}}).composite(tiles).png().toFile(path.join(root,'inspection-sheet.png'));
await fs.writeFile(path.join(root,'validation.json'),JSON.stringify({cases:rows.length,originals:160,degraded:40,positive:80,negative:80,distinct_original_source_groups:160,unique_image_hashes:hashes.size,decoded_images:200,dimensions:'256x256',sharp:sharp.versions.sharp,preparation_only:true,review_pending:40},null,2));
console.log('Validated 200 decodable, unique images; gallery, labels, provenance and training-exclusion manifest written.');
