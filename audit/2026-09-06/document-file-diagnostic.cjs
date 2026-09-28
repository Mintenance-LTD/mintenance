// Synthetic local-only document checks. Requires isolated API 3018 and Supabase 55321.
const fs=require('fs'),dotenv=require('dotenv'),assert=require('assert/strict'),crypto=require('crypto');
const {createClient}=require('@supabase/supabase-js');
const keys=fs.readFileSync('apps/web/test/integration/supabase-test-client.ts','utf8').match(/eyJ[^'\s]+/g);const local='http://127.0.0.1:55321';const db=createClient(local,keys[1],{auth:{persistSession:false}});const users=[],disabled=[];const job=crypto.randomUUID(),bid=crypto.randomUUID(),contract=crypto.randomUUID();let stage='fixtures';
const check=r=>{if(r.error)throw Object.assign(new Error('Local fixture operation failed'),{code:r.error.code});return r.data;};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function user(role){const email='audit-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomBytes(24).toString('base64')+'aA9!';const u=check(await db.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(u.id);check(await db.from('profiles').update({role,first_name:'Synthetic',last_name:'Audit'}).eq('id',u.id));const client=createClient(local,keys[0],{auth:{persistSession:false}});const session=check(await client.auth.signInWithPassword({email,password})).session;return {id:u.id,token:session.access_token};}
async function api(actor,path,body){const r=await fetch('http://127.0.0.1:3018'+path,{method:'POST',headers:{authorization:'Bearer '+actor.token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});return {status:r.status,body:await r.json()};}
(async()=>{try{
const owner=await user('homeowner'),contractor=await user('contractor'),other=await user('homeowner');
check(await db.from('jobs').insert({id:job,homeowner_id:owner.id,contractor_id:contractor.id,title:'Synthetic sandbox maintenance',description:'Synthetic test maintenance only',location:'Synthetic',status:'assigned',budget:10}));
check(await db.from('bids').insert({id:bid,job_id:job,contractor_id:contractor.id,amount:10,description:'Synthetic bid',status:'accepted'}));
check(await db.from('contracts').insert({id:contract,job_id:job,homeowner_id:owner.id,contractor_id:contractor.id,amount:10,status:'accepted',homeowner_signed_at:new Date().toISOString(),contractor_signed_at:new Date().toISOString(),terms:{synthetic:true}}));

stage='contract PDF';
async function get(actor,path){return fetch('http://127.0.0.1:3018'+path,{headers:{authorization:'Bearer '+actor.token},signal:AbortSignal.timeout(90000)});}
for(const actor of [owner,contractor]){const r=await get(actor,'/api/contracts/'+contract+'/pdf');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert(bytes.length>1000);}
assert.equal((await get(other,'/api/contracts/'+contract+'/pdf')).status,404);console.log('PASS: owner and contractor receive real PDF bytes; unrelated user denied.');
stage='uploaded document';const {jsPDF}=require(require('module').createRequire(require('path').resolve('apps/web/package.json')).resolve('jspdf'));const pdf=new jsPDF();pdf.text('Synthetic audit document',10,10);const bytes=Buffer.from(pdf.output('arraybuffer'));const form=new FormData();form.set('file',new Blob([bytes],{type:'application/pdf'}),'synthetic-audit.pdf');form.set('category','other');form.set('job_id',job);
const uploaded=await fetch('http://127.0.0.1:3018/api/contractor/documents',{method:'POST',headers:{authorization:'Bearer '+contractor.token},body:form,signal:AbortSignal.timeout(90000)});assert.equal(uploaded.status,201);const doc=(await uploaded.json()).document;
try{const listed=await get(contractor,'/api/contractor/documents');assert.equal(listed.status,200);const stored=(await listed.json()).documents.find(x=>x.id===doc.id);assert(stored.public_url);assert.equal(new URL(stored.public_url).origin,local);const download=await fetch(stored.public_url);assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes);console.log('PASS: contractor upload downloads identical PDF bytes through signed storage URL.');}
finally{check(await db.storage.from('contractor-documents').remove([doc.storage_path]));check(await db.from('contractor_documents').delete().eq('id',doc.id));}
}finally{
for(const table of ['payment_funding_reservations','escrow_transactions','contracts','bids']){const r=await db.from(table).delete().eq('job_id',job);if(r.error)console.log('Fixture cleanup: '+table+' '+r.error.code);}
await db.from('jobs').delete().eq('id',job);for(const id of users)await db.auth.admin.deleteUser(id);
}})().catch(e=>{console.log(JSON.stringify({result:'FAIL',stage,code:e.code||e.name,message:e.message}));process.exitCode=1});
