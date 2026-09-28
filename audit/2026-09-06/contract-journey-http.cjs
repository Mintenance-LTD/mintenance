// Synthetic local HTTP role matrix. Does not load deployment credentials or send invitations.
const fs = require('fs'), { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const keys = fs.readFileSync('apps/web/test/integration/supabase-test-client.ts', 'utf8').match(/eyJ[^'\s]+/g);
const service = createClient('http://127.0.0.1:55321', keys[1], { auth: { persistSession: false, autoRefreshToken: false } });
const web = process.env.AUDIT_WEB_URL || 'http://localhost:3017', property = randomUUID(), users = [];
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(web)) throw new Error('Local audit server required');
const bearerMode = process.argv.includes('--bearer');
function check(ok, message) { if (!ok) throw new Error(message); }
function db(result) { if (result.error) throw new Error('Local fixture failed: ' + result.error.code); return result.data; }
async function account(role = 'homeowner') {
 const email = `manager_${randomUUID()}@example.invalid`, password = `Aa1!${randomUUID()}`;
 const user = db(await service.auth.admin.createUser({ email, password, email_confirm: true })).user;
 users.push(user.id); db(await service.from('profiles').update({ role, first_name: 'Synthetic', last_name: 'Audit' }).eq('id', user.id));
 const jar = new Map();
 let accessToken;
 async function request(path, method = 'GET', body) {
  const response = await fetch(web + path, { method, headers: { origin: web, ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}), cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), 'x-csrf-token': jar.get('csrf-token') || '', ...(body instanceof FormData ? {} : {'content-type': 'application/json'}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  for (const cookie of response.headers.getSetCookie()) { const part = cookie.split(';')[0], index = part.indexOf('='); jar.set(part.slice(0, index), part.slice(index + 1)); }
  return { status: response.status, data: await response.json().catch(() => null) };
 }
 if (bearerMode) {
  const client = createClient('http://127.0.0.1:55321', keys[0], { auth: { persistSession: false, autoRefreshToken: false } });
  accessToken = db(await client.auth.signInWithPassword({ email, password })).session?.access_token;
  check(accessToken, 'Synthetic provider sign-in failed');
  return { id: user.id, email, request };
 }
 await request('/api/csrf');
 let login = await request('/api/auth/login', 'POST', { email, password });
 check(login.status === 200, 'Synthetic role login failed: ' + login.status);
 return { id: user.id, email, request };
}

let jobId, uploadPath;
(async () => { try {
 const owner = await account(), contractor = await account('contractor'), unrelated = await account();
 // Baseline onboarding fixture only: no provider call or claim of payout verification.
 db(await service.from('profiles').update({verification_status:'verified', stripe_connect_account_id:'acct_synthetic_contract_only',stripe_payouts_enabled:true,stripe_transfers_active:true}).eq('id',contractor.id));
 db(await service.rpc('initialize_trial_period',{p_contractor_id:contractor.id}));
 const photo=await require('sharp')({create:{width:100,height:100,channels:3,background:{r:80,g:150,b:120}}}).png().toBuffer();
 const form=new FormData();form.set('file',new Blob([photo],{type:'image/png'}),'synthetic.png');
 const upload=await owner.request('/api/upload','POST',form);check(upload.status===200,'Photo upload failed: '+upload.status);uploadPath=upload.data.path;
 const job = await owner.request('/api/jobs','POST',{title:'Repair kitchen tap',description:'Synthetic acceptance test: repair a leaking kitchen tap and test the water supply.',photoUrls:[upload.data.url.replace('http://127.0.0.1:55321',process.env.AUDIT_STORAGE_ORIGIN || 'http://127.0.0.1:55321')],category:'plumbing',budget:100,location:'Synthetic test property'});
 check(job.status===201,'Create job failed: '+job.status+' '+JSON.stringify(job.data)); jobId=job.data.job.id;
 console.log('PASS: homeowner creates job through API');
 const bid=await contractor.request('/api/contractor/submit-bid','POST',{jobId,bidAmount:100,proposalText:'I will replace the worn tap washer, check the connections and test for leaks after the repair.',estimatedDuration:1});
 check(bid.status===201,'Submit bid failed: '+bid.status+' '+JSON.stringify(bid.data));
 const bids=db(await service.from('bids').select('id').eq('job_id',jobId)); check(bids.length===1,'Expected one real submitted bid');
 const acceptPath='/api/jobs/'+jobId+'/bids/'+bids[0].id+'/accept';
 check([403,404].includes((await unrelated.request(acceptPath,'POST',{})).status),'Unrelated user accepted bid');
 const accepted=await owner.request(acceptPath,'POST',{});check(accepted.status===200,'Accept bid failed: '+accepted.status+' '+JSON.stringify(accepted.data));
 check((await owner.request(acceptPath,'POST',{})).status===200,'Acceptance retry failed');
 const contracts=db(await service.from('contracts').select('id,status,amount').eq('job_id',jobId));check(contracts.length===1,'Acceptance did not create exactly one contract');
 const id=contracts[0].id;
 check([403,404].includes((await unrelated.request('/api/contracts/'+id+'/accept','POST',{})).status),'Unrelated user signed');
 for(const actor of [owner,contractor]){const signed=await actor.request('/api/contracts/'+id+'/accept','POST',{}); check(signed.status===200,'Sign failed: '+signed.status+' '+JSON.stringify(signed.data));}
 const persisted=db(await service.from('contracts').select('status,homeowner_signed_at,contractor_signed_at,amount').eq('id',id).single());
 check(persisted.status==='accepted' && persisted.homeowner_signed_at && persisted.contractor_signed_at && Number(persisted.amount)===100,'Dual signature not persisted');
 const unsignedFunding=await contractor.request('/api/jobs/'+jobId+'/start','POST',{});check(unsignedFunding.status===400,'Unfunded start allowed: '+unsignedFunding.status);
 console.log('PASS: real bid submission, unauthorized acceptance denial, atomic acceptance/retry creates one contract, both parties sign through routes; unfunded start denied. Onboarding flags are fixtures; no money moved.');
} finally {
 if(jobId){for(const table of ['contract_signatures','contracts','bids']) {const column=table==='contract_signatures'?null:'job_id';if(column) db(await service.from(table).delete().eq(column,jobId));} db(await service.from('jobs').delete().eq('id',jobId));}
 if(uploadPath) db(await service.storage.from('job-attachments').remove([uploadPath]));
 for(const id of users) db(await service.auth.admin.deleteUser(id));
}})().catch(error=>{console.error(error.message);process.exitCode=1;});
