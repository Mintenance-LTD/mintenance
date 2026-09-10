// Local-only, synthetic account probes. Never load deployment credentials.
const fs = require('fs');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const keys = fs.readFileSync('apps/web/test/integration/supabase-test-client.ts','utf8').match(/eyJ[^'\s]+/g);
const url = 'http://127.0.0.1:55321';
const web = 'http://localhost:3017';
const service = createClient(url, keys[1], { auth: { persistSession: false, autoRefreshToken: false } });
const output = [];
function result(name, data) { output.push({ name, ...data }); console.log(JSON.stringify(output.at(-1))); }
function ok(r, label) { if (r.error) throw new Error(label + ': ' + r.error.message); return r.data; }
const accounts = [], properties = [], objects = [];
async function makeUser(role) {
  const email = `audit_${randomUUID()}@example.invalid`, password = `Aa1!${randomUUID()}`;
  const data = ok(await service.auth.admin.createUser({email,password,email_confirm:true}), 'create synthetic account');
  accounts.push(data.user.id);
  ok(await service.from('profiles').update({role,first_name:'Synthetic',last_name:'Audit'}).eq('id',data.user.id),'setup role');
  const client = createClient(url,keys[0],{auth:{persistSession:false,autoRefreshToken:false}});
  const auth = ok(await client.auth.signInWithPassword({email,password}),'local sign-in');
  return {id:data.user.id, email, password, client, token:auth.session.access_token};
}
async function main() {
  const owner = await makeUser('homeowner'), outsider = await makeUser('homeowner');
  ok(await service.from('profiles').update({phone:'+447700900123'}).eq('id',owner.id),'synthetic phone');
  // Existing schema's text column gives the same PostgREST null-filter semantics.
  const nullable = await service.from('profiles').select('id').in('id',[owner.id,outsider.id]).neq('phone',null);
  const notNull = await service.from('profiles').select('id').in('id',[owner.id,outsider.id]).not('phone','is',null);
  result('PostgREST nullable text filters',{neqNullRows:nullable.data?.length,notIsNullRows:notNull.data?.length,neqError:nullable.error?.code??null});
  const otherProperty = ok(await service.from('properties').insert({owner_id:owner.id,property_name:'Synthetic private',address:'Synthetic address',property_type:'residential'}).select('id').single(),'property fixture');
  properties.push(otherProperty.id);
  const before = ok(await outsider.client.from('properties').select('id').eq('id',otherProperty.id),'isolation read');
  const promotion = await outsider.client.from('profiles').update({role:'admin'}).eq('id',outsider.id).select('role').single();
  const after = await outsider.client.from('properties').select('id').eq('id',otherProperty.id);
  result('real REST privilege escalation',{beforeRows:before.length,promotionSucceeded:!promotion.error,afterRows:after.data?.length});
  ok(await service.from('profiles').update({role:'homeowner'}).eq('id',outsider.id),'restore synthetic role');
  const jar = new Map();
  async function request(path, options={}) {
    const headers={cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),origin:web,...options.headers};
    if(jar.has('csrf-token')) headers['x-csrf-token']=jar.get('csrf-token');
    const response=await fetch(web+path,{...options,headers,redirect:'manual'});
    for(const c of response.headers.getSetCookie()) {const part=c.split(';')[0], i=part.indexOf('=');jar.set(part.slice(0,i),part.slice(i+1));}
    return response;
  }
  const csrf = await request('/api/csrf'); await csrf.text();
  const login = await request('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:outsider.email,password:outsider.password})});
  const loginBody=await login.json();
  result('web cookie login',{status:login.status,authenticated:loginBody.user?.id===outsider.id});
  const bearer = await fetch(web+'/api/properties',{headers:{authorization:`Bearer ${outsider.token}`}});
  const bearerBody=await bearer.json();
  result('real Supabase bearer through proxy',{status:bearer.status,error:bearerBody.error});
  if(login.status!==200) return;
  const ownProperty=ok(await outsider.client.from('properties').insert({owner_id:outsider.id,property_name:'Synthetic attacker-owned',address:'Synthetic address',property_type:'residential'}).select('id').single(),'own property');
  properties.push(ownProperty.id);
  const bucket=await service.storage.getBucket('Job-storage');
  if(bucket.error) ok(await service.storage.createBucket('Job-storage',{public:false}),'synthetic bucket');
  const objectPath=`${owner.id}/audit-${randomUUID()}.png`;
  const marker=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
  ok(await service.storage.from('Job-storage').upload(objectPath,marker,{contentType:'image/png'}),'private object');
  objects.push(objectPath);
  const denied=await outsider.client.storage.from('Job-storage').download(objectPath);
  const isolatedSigner=await service.storage.from('Job-storage').createSignedUrl(objectPath,31536000);
  result('isolated privileged signer can access object',{signed:!isolatedSigner.error});
  const foreignUrl=`https://unrelated.example/storage/v1/object/sign/Job-storage/${objectPath}?token=expired`;
  const edit=await request(`/api/properties/${ownProperty.id}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({photos:[foreignUrl]})}); await edit.text();
  // Model a normal cold serverless worker, retaining legitimate login cookies.
  fs.writeFileSync('audit/2026-09-06/restart-local-worker','restart');
  await new Promise(resolve=>setTimeout(resolve,4000));
  for(let i=0;i<20;i++){try{const ready=await fetch(web+'/api/csrf');await ready.text();if(ready.ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}
  const read=await request(`/api/properties/${ownProperty.id}`), body=await read.json();
  let obtained=false;
  if(body.photos?.[0]?.startsWith(url)) {const downloaded=await fetch(body.photos[0]);obtained=downloaded.ok&&Buffer.from(await downloaded.arrayBuffer()).equals(marker);}
  result('private object re-signing through own property API',{directDownloadDenied:!!denied.error,editStatus:edit.status,readStatus:read.status,otherOwnersContentObtained:obtained});
  const shared=createClient(url,keys[1],{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const privilegedBefore=await shared.from('properties').select('id').eq('id',otherProperty.id);
  ok(await shared.auth.signInWithPassword({email:outsider.email,password:outsider.password}),'shared-client login diagnostic');
  const privilegedAfter=await shared.from('properties').select('id').eq('id',otherProperty.id);
  result('service client identity changes after login',{beforeRows:privilegedBefore.data?.length,afterRows:privilegedAfter.data?.length});
  const logout=await request('/api/auth/logout',{method:'POST'}); await logout.text();
  const loggedOut=await request('/api/properties'); await loggedOut.text();
  result('web logout',{logoutStatus:logout.status,subsequentProtectedStatus:loggedOut.status});
}
main().catch(e=>{result('probe failed',{error:e.message});process.exitCode=1;}).finally(async()=>{
  if(objects.length) await service.storage.from('Job-storage').remove(objects);
  if(properties.length) await service.from('properties').delete().in('id',properties);
  for(const id of accounts) await service.auth.admin.deleteUser(id);
  fs.writeFileSync('audit/2026-09-06/local-http-diagnostics.json',JSON.stringify(output,null,2));
});
