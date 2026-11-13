// Zero-dependency server: public timings + password-protected admin API. Run: ADMIN_PASSWORD=secret node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,PASS=process.env.ADMIN_PASSWORD;
if(!PASS){console.error('Set ADMIN_PASSWORD first.');process.exit(1)}
const DATA=path.join(__dirname,'data','data.json'),PUB=path.join(__dirname,'public');
const sessions=new Map(),fails=new Map(),TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const json=(res,code,obj,h={})=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store',...h});res.end(JSON.stringify(obj))};
const same=(a,b)=>{const x=crypto.createHash('sha256').update(a).digest(),y=crypto.createHash('sha256').update(b).digest();return crypto.timingSafeEqual(x,y)};
const token=req=>((req.headers.cookie||'').match(/(?:^|; )sid=([a-f0-9]+)/)||[])[1];
const authed=req=>{const t=token(req),e=sessions.get(t);return !!e&&e>Date.now()};
const body=req=>new Promise((ok,no)=>{let b='';req.on('data',c=>{b+=c;if(b.length>3e6){no(new Error('big'));req.destroy()}});req.on('end',()=>{try{ok(JSON.parse(b||'{}'))}catch(e){no(e)}})});
const GH={repo:process.env.GITHUB_REPO||'AshishCherian15/BUS---Challo',branch:process.env.GITHUB_BRANCH||'main',path:process.env.GITHUB_DATA_PATH||'bus-app/data/data.json',token:process.env.GITHUB_TOKEN||''};
const ghOn=()=>!!GH.token;
const ghH=()=>({'Authorization':'Bearer '+GH.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'bus-timings'});
let ghCache={t:0,v:null};
async function ghRead(){
 const r=await fetch(`https://api.github.com/repos/${GH.repo}/contents/${GH.path}?ref=${GH.branch}`,{headers:ghH(),cache:'no-store'});
 if(!r.ok)throw new Error('GitHub read '+r.status);
 const j=await r.json();
 return{data:JSON.parse(Buffer.from(j.content,'base64').toString('utf8')),sha:j.sha};
}
async function ghWrite(d,sha){
 const r=await fetch(`https://api.github.com/repos/${GH.repo}/contents/${GH.path}`,{method:'PUT',headers:{...ghH(),'Content-Type':'application/json'},body:JSON.stringify({message:'Update bus timings',content:Buffer.from(JSON.stringify(d,null,1)).toString('base64'),sha,branch:GH.branch})});
 if(!r.ok)throw new Error('GitHub write '+r.status);
}
async function readData(){
 if(!ghOn())return{data:JSON.parse(fs.readFileSync(DATA,'utf8')),sha:null};
 if(Date.now()-ghCache.t<20000)return ghCache.v;
 const v=await ghRead();ghCache={t:Date.now(),v};return v;
}
async function writeData(d){
 const out={stops:d.stops,buses:d.buses,trips:d.trips};
 if(!ghOn()){fs.writeFileSync(DATA+'.tmp',JSON.stringify(out,null,1));fs.renameSync(DATA+'.tmp',DATA);return}
 for(let i=0;i<2;i++){const{sha}=await ghRead();try{await ghWrite(out,sha);ghCache.t=0;return}catch(e){if(i)throw e}}
}
const str=(v,n=120)=>typeof v==='string'&&v.length>0&&v.length<=n;
function valid(d){
 const T=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!d||!Array.isArray(d.stops)||!Array.isArray(d.buses)||!Array.isArray(d.trips))return false;
 const ids=new Set();
 for(const s of d.stops){if(!str(s.id,80)||!str(s.name)||ids.has(s.id))return false;ids.add(s.id)}
 const bids=new Set();
 for(const b of d.buses){if(!str(b.id,40)||!str(b.name)||typeof(b.reg||'')!=='string')return false;bids.add(b.id)}
 for(const t of d.trips){if(!str(t.id,40)||!bids.has(t.busId)||!Array.isArray(t.stops)||t.stops.length<2)return false;
  for(const e of t.stops)if(!ids.has(e.stopId)||!T.test(e.time))return false}
 return true;
}
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://x'),p=u.pathname;
 try{
  if(p==='/api/data'&&req.method==='GET')return json(res,200,(await readData()).data);
  if(p==='/api/me')return json(res,authed(req)?200:401,{ok:authed(req)});
  if(p==='/api/login'&&req.method==='POST'){
   const ip=req.socket.remoteAddress,f=fails.get(ip)||{n:0,t:0};
   if(f.n>=8&&Date.now()-f.t<9e5)return json(res,429,{error:'Too many attempts. Try again in 15 minutes.'});
   const {password}=await body(req);
   if(typeof password==='string'&&same(password,PASS)){fails.delete(ip);const t=crypto.randomBytes(24).toString('hex');sessions.set(t,Date.now()+12*36e5);
    return json(res,200,{ok:true},{'Set-Cookie':`sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`})}
   fails.set(ip,{n:f.n+1,t:Date.now()});return json(res,401,{error:'Wrong password.'});
  }
  if(p==='/api/logout'){sessions.delete(token(req));return json(res,200,{ok:true},{'Set-Cookie':'sid=; Max-Age=0; Path=/'})}
  if(p==='/api/data'&&req.method==='POST'){
   if(!authed(req))return json(res,401,{error:'Please sign in again.'});
   const d=await body(req);if(!valid(d))return json(res,400,{error:'Data failed validation.'});
   try{await writeData(d)}catch(e){return json(res,502,{error:'Could not save. Try again.'})}
   return json(res,200,{ok:true});
  }
  let f=p==='/admin'?'/admin.html':(p==='/'||p.startsWith('/s/'))?'/index.html':p;
  const full=path.join(PUB,path.normalize(f));
  if(!full.startsWith(PUB)||!fs.existsSync(full)||fs.statSync(full).isDirectory()){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':TYPES[path.extname(full)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});fs.createReadStream(full).pipe(res);
 }catch(e){json(res,400,{error:'Bad request.'})}
}).listen(PORT,()=>console.log('Running on http://localhost:'+PORT+'  (admin: /admin)'));
