const fs = require('fs');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const keys = fs.readFileSync('apps/web/test/integration/supabase-test-client.ts','utf8').match(/eyJ[^'\s]+/g);
const url='http://127.0.0.1:55321', web='http://localhost:3017';
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,keys[1],options);
const users=[]; let property;
function ok(result){if(result.error) throw new Error(result.error.message);return result.data;}
async function account(){
 const email=`mobile-${randomUUID()}@example.invalid`, password=`Aa1!${randomUUID()}`;
 const {user}=ok(await service.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);
 ok(await service.from('profiles').update({first_name:'Synthetic',last_name:'Mobile',role:'homeowner'}).eq('id',user.id));
 const client=createClient(url,keys[0],options);
 const auth=ok(await client.auth.signInWithPassword({email,password}));
 return {id:user.id,client,token:auth.session.access_token};
}
async function request(token){
 const r=await fetch(`${web}/api/properties/${property}`,{headers:{authorization:`Bearer ${token}`},redirect:'manual'});
 await r.text();return r.status;
}
(async()=>{
 try{
  const owner=await account(), other=await account();
  property=ok(await service.from('properties').insert({owner_id:owner.id,property_name:'Synthetic mobile property',address:'Synthetic',property_type:'residential'}).select('id').single()).id;
  const own=await request(owner.token), unrelated=await request(other.token);
  if(own!==200||unrelated!==404) throw new Error(`Unexpected bearer isolation statuses: owner=${own}, unrelated=${unrelated}`);
  ok(await service.from('profiles').update({tokens_revoked_at:new Date(Date.now()+1000).toISOString()}).eq('id',owner.id));
  const revoked=await request(owner.token);
  if(revoked!==401) throw new Error(`Revoked bearer status=${revoked}`);
  console.log(JSON.stringify({owner:own,unrelated,revoked,result:'PASS'}));
 }finally{
  if(property) ok(await service.from('properties').delete().eq('id',property));
  for(const id of users) ok(await service.auth.admin.deleteUser(id));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
