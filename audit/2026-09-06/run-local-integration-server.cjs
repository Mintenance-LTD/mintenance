// Audit-only launcher. Never loads local deployment credentials.
const {spawn} = require('child_process');
const {randomBytes} = require('crypto');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const env = {};
for (const name of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PATHEXT','NUMBER_OF_PROCESSORS']) {
  if (process.env[name]) env[name]=process.env[name];
}
// next.config.js explicitly invokes dotenv in addition to @next/env. Predefine
// every deployment key as empty so dotenv's default non-override mode cannot
// import credentials. Print neither source values nor resulting secrets.
for (const dir of ['.','apps/web']) for (const name of fs.readdirSync(dir)) {
  if (!name.startsWith('.env') || !fs.statSync(path.join(dir,name)).isFile()) continue;
  for (const key of Object.keys(dotenv.parse(fs.readFileSync(path.join(dir,name))))) env[key]='';
}
Object.assign(env, {
  __NEXT_PROCESSED_ENV:'true', NEXT_TELEMETRY_DISABLED:'1',
  NODE_ENV: process.argv[2]==='dev'?'development':'production',
  NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'audit-local-anon-unconfigured',
  SUPABASE_SERVICE_ROLE_KEY:'audit-local-service-unconfigured',
  JWT_SECRET:randomBytes(64).toString('base64'),
  CSRF_SECRET:randomBytes(32).toString('hex'),
  STRIPE_SECRET_KEY:'sk_test_audit_unconfigured',
  STRIPE_WEBHOOK_SECRET:'whsec_audit_unconfigured',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_test_audit_unconfigured',
  NEXT_PUBLIC_APP_URL:'http://localhost:3017',
  NODE_OPTIONS:'--max-old-space-size=8192',
});
const fixture=fs.readFileSync("apps/web/test/integration/supabase-test-client.ts","utf8");
const localKeys=fixture.match(/eyJ[^'\s]+/g);
env.NODE_ENV="development";env.NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:55321";env.NEXT_PUBLIC_SUPABASE_ANON_KEY=localKeys[0];env.SUPABASE_SERVICE_ROLE_KEY=localKeys[1];
let child;
let restartRequested=false;
function startChild(){
  child=spawn(process.execPath,[path.resolve("audit/2026-09-06/dev-server.cjs")],{cwd:path.resolve("apps/web"),env,stdio:"inherit"});
  child.on("exit",code=>{if(restartRequested){restartRequested=false;startChild();}else process.exit(code??1);});
}
startChild();
const marker=path.resolve('audit/2026-09-06/restart-local-worker');
setInterval(()=>{if(fs.existsSync(marker)){fs.unlinkSync(marker);restartRequested=true;child.kill();}},500);
