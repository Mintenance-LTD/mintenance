// Hosted probes intentionally retrieve no customer rows and perform no mutations.
const fs=require('fs');
const dotenv=require('dotenv');
const env=dotenv.parse(fs.readFileSync('apps/web/.env.local'));
const origin=new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin;
if(origin!=='https://ukrjudtlvapiajkjbcrd.supabase.co')throw new Error('Unexpected audit target');
const key=env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!key)throw new Error('Public API key unavailable');
async function main(){
 const results=[];
 for(const route of ['/auth/v1/settings','/auth/v1/.well-known/jwks.json','/rest/v1/profiles?select=id&limit=0','/rest/v1/escrow_transactions?select=id&limit=0','/functions/v1/setup-contractor-payout']){
  const r=await fetch(origin+route,{headers:{apikey:key},signal:AbortSignal.timeout(20000)});
  const body=await r.json().catch(()=>null);
  const observation={route,status:r.status};
  if(Array.isArray(body))observation.returnedRows=body.length;
  if(route.includes('jwks'))observation.signingAlgorithms=body?.keys?.map(k=>k.alg??k.kty);
  if(route.includes('settings'))observation.authSettings={disable_signup:body?.disable_signup,mailer_autoconfirm:body?.mailer_autoconfirm,phone_autoconfirm:body?.phone_autoconfirm,anonymous_users_enabled:body?.anonymous_users_enabled};
  results.push(observation);
 }
 fs.writeFileSync('audit/2026-09-06/hosted-api-readonly.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
