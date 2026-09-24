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

 stage='3DS challenge';
 const pi=await stripe.paymentIntents.create({amount:100,currency:'gbp',payment_method_types:['card'],metadata:{audit_run:run}});intents.push(pi.id);
 const action=await stripe.paymentIntents.confirm(pi.id,{payment_method:'pm_card_authenticationRequired',return_url:'http://localhost:3019/complete'});assert.equal(action.status,'requires_action');assert.equal(action.next_action.type,'redirect_to_url');
 const server=require('http').createServer((req,res)=>{if(req.url==='/start'){res.writeHead(302,{Location:action.next_action.redirect_to_url.url});res.end();}else{res.writeHead(200,{'content-type':'text/html'});res.end('<h1>Stripe sandbox challenge returned</h1><p>The diagnostic will verify the payment status with Stripe.</p>');}}).listen(3019,'127.0.0.1');
 console.log('Challenge ready at http://localhost:3019/start; waiting at most five minutes.');
 try{let final;for(let i=0;i<150;i++){final=await stripe.paymentIntents.retrieve(pi.id);if(final.status!=='requires_action')break;await sleep(2000);}console.log(JSON.stringify({check:'completed-3ds-challenge',status:final.status,livemode:final.livemode}));assert.equal(final.status,'succeeded');}finally{server.close();}
}finally{
 for(const id of intents){try{const pi=await stripe.paymentIntents.retrieve(id);if(pi.status==='succeeded'){const ch=await stripe.charges.retrieve(pi.latest_charge);if(!ch.refunded)await stripe.refunds.create({payment_intent:id},{idempotencyKey:'cleanup-'+id});}else if(pi.status!=='canceled')await stripe.paymentIntents.cancel(id);}catch{console.log('Synthetic payment cleanup needs review');process.exitCode=1;}}
 if(account){try{await stripe.accounts.del(account.id);console.log('Synthetic Connect account removed.');}catch{console.log('Synthetic Connect account cleanup needs review');process.exitCode=1;}}
 await sleep(4000);
 for(const id of disabled){let restored=false;for(let i=0;i<3&&!restored;i++){try{await stripe.webhookEndpoints.update(id,{disabled:false});restored=(await stripe.webhookEndpoints.retrieve(id)).status==='enabled';}catch{await sleep(1000);}}if(!restored){console.log('URGENT: hosted test webhook restoration failed');process.exitCode=1;}else console.log('Hosted test webhook restored and verified enabled.');}
}})().catch(e=>{console.log(JSON.stringify({result:'FAIL',stage,code:e.code||e.type||e.name}));process.exitCode=1});
