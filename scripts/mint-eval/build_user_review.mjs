/** Prepare a blinded, offline human review pack. Never invent or prefill labels. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve('.vercel/mint-eval');
const out = path.join(root, 'your-review-v2');
const all = (await fs.readFile(path.join(root, 'pilot/manifest.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const rank = r => createHash('sha256').update(`mint-user-review-v1:${r.id}`).digest('hex');
const pick = (rows, n) => [...rows].sort((a,b)=>rank(a).localeCompare(rank(b))).slice(0,n);
const selected = [...pick(all.filter(r=>r.cohort==='original' && r.crack_present),8),
  ...pick(all.filter(r=>r.cohort==='original' && !r.crack_present),8),
  ...['dark','overexposed','blurred','low_resolution'].flatMap(t=>pick(all.filter(r=>r.transformation===t),1))]
  .sort((a,b)=>rank(a).localeCompare(rank(b)));
await fs.mkdir(path.join(out,'images'),{recursive:true});
const manifest = [];
for(const [index,row] of selected.entries()) {
  const bytes = await fs.readFile(path.join(root,'pilot',row.image));
  const sha = createHash('sha256').update(bytes).digest('hex');
  if(sha!==row.sha256)throw Error('Source image changed');
  const image = `images/photo-${index+1}${path.extname(row.image)}`;
  await fs.writeFile(path.join(out,image),bytes);
  manifest.push({caseId:row.id,image,sha256:sha});
}
const pack = {version:1,id:'mint-user-review-v2',purpose:'development_review_only',trainingAllowed:false,cases:manifest};
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(pack,null,2));
const cards=manifest.map((r,i)=>`<section data-index="${i}"><h2>Photo ${i+1}</h2><a href="${r.image}" target="_blank"><img src="${r.image}" alt="Surface photo ${i+1}" width="256" height="256"></a><label>Can you inspect this surface?<select data-field="readability"><option value="">Choose…</option><option value="readable">Yes, readable</option><option value="unreadable">No, retake photo</option><option value="uncertain">I am unsure</option></select></label><label>Is a crack visible (rather than pores, holes or texture)?<select data-field="crack"><option value="">Choose…</option><option value="yes">Yes</option><option value="no">No</option><option value="uncertain">I am unsure</option><option value="unassessable">Cannot assess from this photo</option></select></label><label>What can you see, and where? What remains uncertain?<textarea data-field="notes" rows="3"></textarea></label></section>`).join('');
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Mint AI photo review</title><style>body{font:16px system-ui;background:#f1f6f3;color:#193b31;margin:24px}header{max-width:850px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}section{background:white;border-radius:12px;padding:20px}label{display:block;margin:14px 0}select,input,textarea{display:block;box-sizing:border-box;width:100%;padding:9px;margin-top:5px;font:inherit}img{max-width:100%;object-fit:contain}button{background:#245f4f;color:white;padding:12px 18px;border:0;border-radius:6px;font:inherit;cursor:pointer}.bar{position:sticky;top:0;background:#f1f6f3;padding:12px 0;z-index:1}#status{margin-left:16px}</style><header><h1>Your Mint AI photo review</h1><p>Review these 20 surface photos without seeing the AI answer. You do not need to guess a cause, measure a crack, or judge whether a building is safe. Choose “I am unsure” whenever appropriate.</p><p>This public development set helps diagnose mistakes. It will not be used to train Mint or presented as an independent release test. Your answers are personal observations unless separately verified by a qualified reviewer.</p><label>Your name or reviewer reference<input id="reviewer" autocomplete="off"></label><p>Answers stay in this browser where supported. Download your answers before closing; send the downloaded JSON back in this chat. Nothing is submitted automatically.</p></header><div class="bar"><button id="download">Download my review</button><span id="status" role="status"></span></div><main>${cards}</main><footer><p>Images: SDNET2018, Maguire, Dorafshan &amp; Thomas (2018), CC BY 4.0. Some images have been deliberately degraded. <a href="https://digitalcommons.usu.edu/all_datasets/48/">Source and licence</a>.</p></footer><script>
const pack=${JSON.stringify(pack)};
const key=pack.id; let draft={reviewer:'',answers:{}};
try{draft=JSON.parse(localStorage.getItem(key))||draft}catch{}
const reviewer=document.querySelector('#reviewer');reviewer.value=draft.reviewer||'';
for(const section of document.querySelectorAll('section')){const id=pack.cases[Number(section.dataset.index)].caseId;for(const field of section.querySelectorAll('[data-field]'))field.value=draft.answers?.[id]?.[field.dataset.field]||'';}
function collect(){return {reviewer:reviewer.value.trim(),answers:Object.fromEntries([...document.querySelectorAll('section')].map(s=>[pack.cases[Number(s.dataset.index)].caseId,Object.fromEntries([...s.querySelectorAll('[data-field]')].map(f=>[f.dataset.field,f.value]))]))};}
function applyReadability(section){const r=section.querySelector('[data-field=readability]');const c=section.querySelector('[data-field=crack]');c.disabled=r.value!=='readable';if(r.value==='unreadable')c.value='unassessable';else if(r.value==='uncertain')c.value='uncertain';else if(c.value==='unassessable')c.value='';} for(const s of document.querySelectorAll('section'))applyReadability(s); document.addEventListener('change',event=>{if(event.target.dataset.field==='readability'){applyReadability(event.target.closest('section'));draft=collect();try{localStorage.setItem(key,JSON.stringify(draft));}catch{}}});
document.addEventListener('input',()=>{draft=collect();try{localStorage.setItem(key,JSON.stringify(draft));}catch{document.querySelector('#status').textContent='Download to save your answers.';}});
document.querySelector('#download').addEventListener('click',()=>{draft=collect();const completed=Object.values(draft.answers).filter(a=>a.readability&&a.crack&&a.notes.trim()).length;if(!draft.reviewer){document.querySelector('#status').textContent='Enter your name or reviewer reference first.';return;}const result={...pack,reviewedAt:new Date().toISOString(),reviewer:draft.reviewer,reviewerQualification:'not_verified',completed,cases:pack.cases.map(c=>({...c,...draft.answers[c.caseId]}))};const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='mint-my-photo-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#status').textContent='Downloaded '+completed+' of 20 completed answers. Unanswered items remain blank.';});
</script></html>`);
console.log(JSON.stringify({out,cases:manifest.length,trainingAllowed:false}));

