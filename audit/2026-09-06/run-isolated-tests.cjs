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
env.NODE_ENV="test";
const child=spawn(process.execPath,[path.resolve("node_modules/vitest/vitest.mjs"),"run","--config","apps/web/vitest.config.ts","--reporter=dot","--maxWorkers=4",...process.argv.slice(2)],{cwd:process.cwd(),env,stdio:"inherit"});
child.on("exit",code=>process.exit(code??1));
