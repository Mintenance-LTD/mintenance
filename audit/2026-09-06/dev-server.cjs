const path=require('path');
const http=require('http');
const next=require('next');
const config=require(path.resolve('next.config.js'));
const app=next({dev:true,dir:process.cwd(),conf:{...config,distDir:'../../audit/2026-09-06/next-dev'}});
app.prepare().then(()=>{
  http.createServer(app.getRequestHandler()).listen(3017,'127.0.0.1',()=>console.log('Audit-only dev server on http://127.0.0.1:3017'));
}).catch(e=>{console.error(e.message);process.exit(1)});
