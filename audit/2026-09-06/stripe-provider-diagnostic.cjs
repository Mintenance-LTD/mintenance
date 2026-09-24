// Synthetic test-mode diagnostic. Requires isolated audit server on 3018 and local Supabase on 55321.
// Temporarily disables the named hosted TEST webhook and restores it in finally.
if (!process.argv.includes('--allow-temporary-test-webhook-disable')) throw new Error('Explicit webhook-isolation approval flag required');
const fs=require('fs'),dotenv=require('dotenv'),assert=require('assert/strict'),crypto=require('crypto');
const {createRequire}=require('module');const requireWeb=createRequire(require('path').resolve('apps/web/package.json'));const Stripe=requireWeb('stripe');
const cfg=dotenv.parse(fs.readFileSync('apps/web/.env.test'));assert(cfg.STRIPE_SECRET_KEY?.startsWith('sk_test_'));assert(cfg.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_'));
const stripe=new Stripe(cfg.STRIPE_SECRET_KEY,{maxNetworkRetries:1,timeout:20000});const run=crypto.randomUUID();const intents=[];const disabled=[];let account;let stage='isolation';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 const balance=await stripe.balance.retrieve();assert.equal(balance.livemode,false);
 const endpoints=await stripe.webhookEndpoints.list({limit:100});assert(!endpoints.has_more);
 for(const ep of endpoints.data){assert.equal(ep.livemode,false);if(ep.status!=='enabled')continue;assert.equal(new URL(ep.url).hostname,'web-nu-six-10.vercel.app');disabled.push(ep.id);await stripe.webhookEndpoints.update(ep.id,{disabled:true});assert.equal((await stripe.webhookEndpoints.retrieve(ep.id)).status,'disabled');}
 console.log('Hosted test webhook temporarily disabled and verified.');
 stage='successful payment';
 const pi=await stripe.paymentIntents.create({amount:100,currency:'gbp',payment_method_types:['card'],metadata:{audit_run:run},description:'Synthetic Mintenance sandbox diagnostic'},{idempotencyKey:'audit-'+run});intents.push(pi.id);assert.equal(pi.livemode,false);
 const repeat=await stripe.paymentIntents.create({amount:100,currency:'gbp',payment_method_types:['card'],metadata:{audit_run:run},description:'Synthetic Mintenance sandbox diagnostic'},{idempotencyKey:'audit-'+run});assert.equal(repeat.id,pi.id);
 const pub=await fetch('https://api.stripe.com/v1/payment_intents/'+pi.id+'?client_secret='+encodeURIComponent(pi.client_secret),{headers:{Authorization:'Bearer '+cfg.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}});assert.equal(pub.status,200);assert.equal((await pub.json()).id,pi.id);console.log('PASS: publishable/secret key pair and provider idempotency.');
 const paid=await stripe.paymentIntents.confirm(pi.id,{payment_method:'pm_card_visa'});assert.equal(paid.status,'succeeded');assert.equal(paid.amount_received,100);console.log('PASS: GBP 1.00 synthetic card payment succeeded.');
 stage='refund';const refund=await stripe.refunds.create({payment_intent:pi.id},{idempotencyKey:'refund-'+run});assert.equal(refund.status,'succeeded');console.log('PASS: full sandbox refund succeeded.');
 stage='decline';const declined=await stripe.paymentIntents.create({amount:100,currency:'gbp',payment_method_types:['card'],metadata:{audit_run:run}});intents.push(declined.id);
 let failure;try{await stripe.paymentIntents.confirm(declined.id,{payment_method:'pm_card_chargeDeclined'});}catch(e){failure=e.code;}assert.equal(failure,'card_declined');assert.equal((await stripe.paymentIntents.retrieve(declined.id)).status,'requires_payment_method');console.log('PASS: declined card remains unpaid and requires another method.');
 stage='authentication';const challenge=await stripe.paymentIntents.create({amount:100,currency:'gbp',payment_method_types:['card'],metadata:{audit_run:run}});intents.push(challenge.id);const action=await stripe.paymentIntents.confirm(challenge.id,{payment_method:'pm_card_authenticationRequired',return_url:'http://localhost:3018/dashboard'});assert.equal(action.status,'requires_action');assert(action.next_action);console.log('PASS: authentication-required payment is pending, not succeeded. Challenge UI not completed.');
 stage='connect setup';account=await stripe.accounts.create({type:'express',country:'GB',email:'audit-'+run+'@example.invalid',capabilities:{transfers:{requested:true},card_payments:{requested:true}},metadata:{audit_run:run}});console.log(JSON.stringify({check:'synthetic-connect-account-created',chargesEnabled:account.charges_enabled,payoutsEnabled:account.payouts_enabled,requirements:account.requirements.currently_due}));
 stage='delivery wait';await sleep(8000);
 const events=await stripe.events.list({created:{gte:Math.floor(Date.now()/1000)-120},limit:100});const matching=events.data.filter(e=>intents.includes(e.data.object.id)||intents.includes(e.data.object.payment_intent));console.log(JSON.stringify({check:'provider-events-created',count:matching.length,types:[...new Set(matching.map(e=>e.type))]}));
}finally{
 for(const id of intents){try{const pi=await stripe.paymentIntents.retrieve(id);if(pi.status==='succeeded'){const ch=await stripe.charges.retrieve(pi.latest_charge);if(!ch.refunded)await stripe.refunds.create({payment_intent:id},{idempotencyKey:'cleanup-'+id});}else if(pi.status!=='canceled')await stripe.paymentIntents.cancel(id);}catch{console.log('Synthetic payment cleanup needs review');process.exitCode=1;}}
 if(account){try{await stripe.accounts.del(account.id);console.log('Synthetic Connect account removed.');}catch{console.log('Synthetic Connect account cleanup needs review');process.exitCode=1;}}
 await sleep(4000);
 for(const id of disabled){let restored=false;for(let i=0;i<3&&!restored;i++){try{await stripe.webhookEndpoints.update(id,{disabled:false});restored=(await stripe.webhookEndpoints.retrieve(id)).status==='enabled';}catch{await sleep(1000);}}if(!restored){console.log('URGENT: hosted test webhook restoration failed');process.exitCode=1;}else console.log('Hosted test webhook restored and verified enabled.');}
}})().catch(e=>{console.log(JSON.stringify({result:'FAIL',stage,code:e.code||e.type||e.name}));process.exitCode=1});
