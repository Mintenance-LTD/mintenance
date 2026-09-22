// Synthetic localhost HTTP + actual Storage API verification. Never loads deployment keys.
const fs=require('fs'),{randomUUID}=require('crypto'),{execFileSync}=require('child_process');
const {createClient}=require('@supabase/supabase-js');
const keys=fs.readFileSync('apps/web/test/integration/supabase-test-client.ts','utf8').match(/eyJ[^'\s]+/g);
const local='http://127.0.0.1:55321',web='http://localhost:3017';
const service=createClient(local,keys[1],{auth:{persistSession:false,autoRefreshToken:false}});
const users=[],job=randomUUID(),escrow=randomUUID(),dispute=randomUUID();let object;
function check(condition,message){if(!condition)throw new Error(message);}
function db(result){if(result.error)throw new Error('Local fixture operation failed: '+result.error.code);return result.data;}
async function user(role){const email=`archive_${randomUUID()}@example.invalid`,password=`Aa1!${randomUUID()}`;const {user}=db(await service.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);db(await service.from('profiles').update({role,first_name:'Synthetic',last_name:'Audit'}).eq('id',user.id));const client=createClient(local,keys[0],{auth:{persistSession:false,autoRefreshToken:false}});db(await client.auth.signInWithPassword({email,password}));return{id:user.id,email,password,client};}
async function login(account){const jar=new Map();async function request(path,options={}){const response=await fetch(web+path,{...options,headers:{origin:web,cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),'x-csrf-token':jar.get('csrf-token')||'','content-type':'application/json',...options.headers},redirect:'manual',signal:AbortSignal.timeout(90000)});for(const c of response.headers.getSetCookie()){const [part]=c.split(';');const index=part.indexOf('=');jar.set(part.slice(0,index),part.slice(index+1));}return response;}await(await request('/api/csrf')).text();const res=await request('/api/auth/login',{method:'POST',body:JSON.stringify({email:account.email,password:account.password})});check(res.status===200,'Local cookie login failed: '+res.status);await res.text();return request;}
(async()=>{try{
 const owner=await user('homeowner'),contractor=await user('contractor'),outsider=await user('homeowner');
 db(await service.from('jobs').insert({id:job,homeowner_id:owner.id,contractor_id:contractor.id,title:'Synthetic maintenance',description:'Synthetic maintenance description',location:'Synthetic',status:'posted'}));
 db(await service.from('escrow_transactions').insert({id:escrow,job_id:job,payer_id:owner.id,payee_id:contractor.id,amount:100,status:'refunded'}));
 object=`${job}/disputes/${owner.id}/evidence.png`;
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
 db(await owner.client.storage.from('job-attachments').upload(object,bytes,{contentType:'image/png',upsert:false}));
 db(await service.from('disputes').insert({id:dispute,job_id:job,raised_by:owner.id,against:contractor.id,reason:'quality',description:`Synthetic statement\n\nEvidence:\n1. job-attachments:${object}`,status:'resolved'}));
 db(await service.from('dispute_escrow_links').insert({dispute_id:dispute,escrow_id:escrow}));
 const signedIn=await login(contractor),unrelated=await login(outsider),deleting=await login(owner);
 const deletion=await deleting('/api/user/delete-account',{method:'POST',body:JSON.stringify({confirmation:'DELETE'})});const outcome=await deletion.json();check(deletion.status===200&&outcome.success===true,'Full account-deletion HTTP journey not complete: '+deletion.status);const authGone=await service.auth.admin.getUserById(owner.id);check(authGone.error?.code==='user_not_found','Auth user still exists');
 const response=await signedIn(`/api/disputes/${escrow}`);const body=await response.json();check(response.status===200&&body.archived===true,'Archive HTTP read failed: '+response.status);
 check(body.dispute_evidence?.[0]?.url,'Archived evidence URL missing');const content=await fetch(body.dispute_evidence[0].url);check(content.ok,'Archived object download failed');check(Buffer.from(await content.arrayBuffer()).equals(bytes),'Archived evidence bytes changed');
 const denied=await unrelated(`/api/disputes/${escrow}`);check([403,404].includes(denied.status),'Unrelated archive read allowed');await denied.text();
 const listed=await signedIn('/api/disputes/retained');const list=await listed.json();check(listed.ok&&list.records.some(r=>r.escrow_id===escrow),'Archive absent from participant list');
 const otherList=await unrelated('/api/disputes/retained');const other=await otherList.json();check(otherList.ok&&!other.records.some(r=>r.escrow_id===escrow),'Archive leaked in unrelated list');
 console.log('PASS: real cookie logins, account deletion, archived API read/list, byte-identical private Storage download, and unrelated-user denial.');
}finally{
 if(object)await service.storage.from('job-attachments').remove([object]);
 const ids=users.map(id=>`'${id}'`).join(',');
 if(ids)execFileSync('docker',['exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-v','ON_ERROR_STOP=1'],{input:`DELETE FROM public.jobs WHERE id='${job}'; DELETE FROM public.profiles WHERE id IN (${ids}); DELETE FROM public.retained_dispute_access_log WHERE dispute_id='${dispute}'; DELETE FROM public.retained_dispute_records WHERE dispute_id='${dispute}'; DELETE FROM public.account_deletion_operations WHERE user_id IN (${ids});`,stdio:['pipe','ignore','pipe']});
 for(const id of users)await service.auth.admin.deleteUser(id);
}})().catch(error=>{console.error(error.message);process.exitCode=1;});
