// Starts an isolated Next instance with the sanitized parent environment; no provider credentials.
if (process.env.__NEXT_PROCESSED_ENV !== 'true' || process.env.SUPABASE_SERVICE_ROLE_KEY !== 'audit-local-service-unconfigured') throw new Error('Use run-location-policy-browser.cjs with its sanitized environment');
const http=require('http');
const path=require('path');
const assert=require('assert/strict');
const next=require('next');
const {chromium}=require('playwright');
const config=require(path.resolve('next.config.js'));
const app=next({dev:true,dir:process.cwd(),conf:{...config,distDir:'../../audit/2026-09-06/next-location-policy'}});
let server;let browser;
(async()=>{
 try {
  await app.prepare();
  server=http.createServer(app.getRequestHandler());
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({geolocation:{latitude:51.5,longitude:-0.1},permissions:['geolocation']});
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage();
  const response=await page.goto(origin+'/login',{waitUntil:'domcontentloaded',timeout:120000});
  assert.equal(response.status(),200);
  const policy=response.headers()['permissions-policy'];
  assert.match(policy,/geolocation=\(self\)/);
  const allowed=await page.evaluate(()=>new Promise(resolve=>navigator.geolocation.getCurrentPosition(
    p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),e=>resolve({error:e.code}),{timeout:5000})));
  assert.deepEqual(allowed,{latitude:51.5,longitude:-0.1});
  await context.grantPermissions([],{origin});
  const denied=await page.evaluate(()=>new Promise(resolve=>navigator.geolocation.getCurrentPosition(
    ()=>resolve({allowed:true}),e=>resolve({error:e.code}),{timeout:5000})));
  assert.deepEqual(denied,{error:1});
  console.log('PASS: actual Next login response permits same-origin geolocation; Chromium granted coordinates and denied permission behave correctly');
 } finally {
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  await app.close();
 }
})().then(()=>process.exit(0),error=>{console.error(error.message);process.exit(1)});
