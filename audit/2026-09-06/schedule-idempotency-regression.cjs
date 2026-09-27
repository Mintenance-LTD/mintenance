// Local-only concurrent regression. Creates and removes synthetic fixtures.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const keys=fs.readFileSync('apps/web/test/integration/supabase-test-client.ts','utf8').match(/eyJ[^'\s]+/g);
const service=createClient('http://127.0.0.1:55321',keys[1],{auth:{persistSession:false,autoRefreshToken:false}});
const ids=[]; const property=randomUUID();
const details={title:'Synthetic recurring task',description:null,task_type:'general',category:'general',frequency:'annual',next_due_date:'2030-01-01',auto_create_job:false};
const checked=r=>{if(r.error)throw Error(r.error.code);return r.data;};
(async()=>{try{
 for(let i=0;i<2;i++){const user=checked(await service.auth.admin.createUser({email:`schedule_${randomUUID()}@example.invalid`,password:`Synthetic9${randomUUID()}`,email_confirm:true})).user;ids.push(user.id);}
 checked(await service.from('properties').insert({id:property,owner_id:ids[0],property_name:'Synthetic concurrency',address:'Synthetic',property_type:'residential'}));
 const call=(key,payload=details,actor=ids[0])=>service.rpc('create_recurring_schedule_once',{p_actor_id:actor,p_property_id:property,p_request_id:key,p_details:payload});
 const key=randomUUID();
 const results=await Promise.all(Array.from({length:12},()=>call(key)));
 results.forEach(checked); assert.equal(new Set(results.map(r=>r.data.id)).size,1);
 assert.equal((await service.from('recurring_schedules').select('id',{count:'exact'}).eq('property_id',property)).count,1);
 assert.equal(checked(await call(key)).id,results[0].data.id);
 assert.equal((await call(key,{...details,title:'Changed details'})).error.code,'22023');
 assert.equal((await call(key,details,ids[1])).error.code,'42501');
 const failedKey=randomUUID(); assert.ok((await call(failedKey,{...details,frequency:'invalid'})).error);
 checked(await call(failedKey)); // Invalid insertion must roll back its receipt too.
 checked(await service.from('recurring_schedules').delete().eq('id',results[0].data.id));
 assert.equal((await call(key)).error.code,'P0002');
 const anon=createClient('http://127.0.0.1:55321',keys[0],{auth:{persistSession:false}});
 assert.ok((await anon.rpc('create_recurring_schedule_once',{p_actor_id:ids[0],p_property_id:property,p_request_id:randomUUID(),p_details:details})).error);
 console.log('PASS: 12 concurrent requests -> one schedule; replay, payload conflict, unrelated user, rollback, deleted schedule and anonymous denial.');
}finally{
 checked(await service.from('properties').delete().eq('id',property));
 for(const id of ids)checked(await service.auth.admin.deleteUser(id));
 console.log('Synthetic fixtures removed.');
}})().catch(e=>{console.error(e.message);process.exitCode=1});
