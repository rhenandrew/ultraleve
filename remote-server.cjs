const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const model=require('./content-model.js');
const dir=process.env.ULTRA_DATA_DIR;
if(!dir)throw Error('ULTRA_DATA_DIR obrigatorio');
fs.mkdirSync(dir,{recursive:true,mode:0o700});
const stateFile=path.join(dir,'account.json'),contentFile=path.join(dir,'content.json');
const origin=process.env.ULTRA_ORIGIN||'https://api.stream.dev.br';
const allowedOrigins=new Set([origin,process.env.ULTRA_PANEL_ORIGIN].filter(Boolean));
const prefix='/ultraleve';
const hash=(password,salt)=>crypto.scryptSync(password,salt,64).toString('hex');
function atomic(file,data){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n',{mode:0o600});fs.renameSync(temp,file);}
if(!fs.existsSync(stateFile)){
  const salt=crypto.randomBytes(16).toString('hex');
  atomic(stateFile,{user:'admin',salt,hash:hash('admin',salt),setup:true,token:crypto.randomBytes(32).toString('hex'),expires:Date.now()+86400000});
}
if(!fs.existsSync(contentFile))atomic(contentFile,model.validate(JSON.parse(fs.readFileSync(path.join(__dirname,'content.json'),'utf8'))));
let account=JSON.parse(fs.readFileSync(stateFile,'utf8'));
const sessions=new Map(),attempts=new Map();
const etag=s=>'"'+crypto.createHash('sha256').update(s).digest('hex')+'"';
const contentVersion=value=>typeof value==='string'?value.replace(/^W\//,''):value;
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
function cookie(req,name){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);}
function cookies(res,values){res.setHeader('Set-Cookie',values.map(v=>v+`; Path=${prefix}; HttpOnly; SameSite=Strict`+(process.env.ULTRA_SECURE_COOKIE==='0'?'':'; Secure')));}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
async function body(req,max=8192){let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>max)throw Error('limit');}return JSON.parse(data);}
function session(req){const id=cookie(req,'ultra_session'),s=sessions.get(id);if(!s||s.expires<Date.now()){sessions.delete(id);return null;}return s;}
const staticFiles={'/login':['remote-login.html','text/html; charset=utf-8'],'/remote-login.js':['remote-login.js','application/javascript'],'/admin.css':['admin.css','text/css'],'/painel':['admin.html','text/html; charset=utf-8'],'/admin.html':['admin.html','text/html; charset=utf-8'],'/admin.js':['admin.js','application/javascript'],'/content-model.js':['content-model.js','application/javascript']};
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Robots-Tag','noindex, nofollow');
  const url=new URL(req.url,'http://localhost'),name=url.pathname;
  const s=session(req);
  if(name==='/health'){res.end('ok');return;}
  if(name==='/ativar'&&req.method==='GET'){
    if(!account.setup||Date.now()>account.expires||!same(url.searchParams.get('token'),account.token)){send(res,403,{error:'Convite invalido ou expirado.'});return;}
    cookies(res,['ultra_setup='+account.token+'; Max-Age=1800']);res.writeHead(303,{Location:prefix+'/login'}).end();return;
  }
  if(['POST','PUT','DELETE'].includes(req.method)){
    if(!allowedOrigins.has(req.headers.origin)||!req.headers['content-type']?.startsWith('application/json')){send(res,403,{error:'Origem nao autorizada.'});return;}
  }
  if(name==='/api/session'&&req.method==='GET'){send(res,200,{authenticated:!!s,mustChange:!!s?.mustChange});return;}
  if(name==='/api/session'&&req.method==='POST'){
    const ip=req.socket.remoteAddress==='127.0.0.1'||req.socket.remoteAddress==='::ffff:127.0.0.1'?req.headers['x-real-ip']||req.socket.remoteAddress:req.socket.remoteAddress;
    const key=String(ip),now=Date.now(),old=attempts.get(key),a=old&&old.until>now?old:{count:0,until:now+60000};
    if(a.count>=10){res.setHeader('Retry-After','60');send(res,429,{error:'Aguarde um minuto.'});return;}
    try{
      const data=await body(req);
      const invited=!account.setup||(Date.now()<account.expires&&same(cookie(req,'ultra_setup'),account.token));
      if(!invited||data.user!==account.user||typeof data.password!=='string'||data.password.length>256||!same(hash(data.password,account.salt),account.hash)){
        a.count++;attempts.set(key,a);send(res,401,{error:'Acesso nao autorizado. No primeiro acesso, use o convite privado.'});return;
      }
      attempts.delete(key);const id=crypto.randomBytes(32).toString('hex');sessions.set(id,{expires:now+3600000,mustChange:account.setup});cookies(res,['ultra_session='+id+'; Max-Age=3600']);send(res,200,{mustChange:account.setup});
    }catch{send(res,400,{error:'Dados invalidos.'});}return;
  }
  if(name==='/api/password'&&req.method==='POST'){
    if(!s){send(res,401,{error:'Entre novamente.'});return;}
    try{const data=await body(req);if(typeof data.password!=='string'||data.password.length<12||data.password.length>256||data.password==='admin'){send(res,400,{error:'Use uma senha de pelo menos 12 caracteres.'});return;}
      const salt=crypto.randomBytes(16).toString('hex');account={user:account.user,salt,hash:hash(data.password,salt),setup:false};atomic(stateFile,account);sessions.clear();const id=crypto.randomBytes(32).toString('hex');sessions.set(id,{expires:Date.now()+3600000,mustChange:false});cookies(res,['ultra_session='+id+'; Max-Age=3600','ultra_setup=; Max-Age=0']);send(res,200,{ok:true});
    }catch{send(res,400,{error:'Nao foi possivel alterar a senha.'});}return;
  }
  if(name==='/api/logout'&&req.method==='POST'){sessions.delete(cookie(req,'ultra_session'));cookies(res,['ultra_session=; Max-Age=0']);send(res,200,{ok:true});return;}
  if(name==='/api/content'){
    if(req.method==='GET'){
      const allowed=['https://rhenandrew.github.io','https://bandaultraleve.com.br','https://www.bandaultraleve.com.br'];
      if(allowed.includes(req.headers.origin)){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');}
      try{const text=fs.readFileSync(contentFile,'utf8');res.setHeader('ETag',etag(text));res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'}).end(text);}catch{send(res,500,{error:'Conteudo indisponivel.'});}return;
    }
    if(req.method!=='PUT'){send(res,405,{error:'Metodo nao permitido.'});return;}
    if(!s||s.mustChange){send(res,403,{error:'Entre e altere a senha inicial antes de editar.'});return;}
    try{const data=model.validate(await body(req,250000)),previous=fs.readFileSync(contentFile,'utf8');if(contentVersion(req.headers['if-match'])!==etag(previous)){send(res,409,{error:'Conteudo atualizado por outra pessoa. Recarregue o painel.'});return;}
      atomic(contentFile,data);res.setHeader('ETag',etag(fs.readFileSync(contentFile,'utf8')));send(res,200,data);
    }catch{send(res,400,{error:'Conteudo invalido.'});}return;
  }
  if(name==='/'&&req.method==='GET'){res.writeHead(303,{Location:prefix+'/login'}).end();return;}
  if(!['GET','HEAD'].includes(req.method)||!staticFiles[name]){send(res,404,{error:'Nao encontrado.'});return;}
  if(['/painel','/admin.html','/admin.js'].includes(name)&&(!s||s.mustChange)){res.writeHead(303,{Location:prefix+'/login'}).end();return;}
  const [file,type]=staticFiles[name];let data=fs.readFileSync(path.join(__dirname,file));
  if(file==='admin.html')data=Buffer.from(data.toString().replace('<head>','<head><base href="'+prefix+'/">').replace('Painel da banda · Local','Painel da banda').replace('href="/"','href="https://bandaultraleve.com.br/"').replace('</header>','<a href="login">Senha e acesso</a></header>'));
  res.writeHead(200,{'Content-Type':type}).end(req.method==='HEAD'?undefined:data);
});
server.listen(Number(process.env.PORT||8188),process.env.HOST||'127.0.0.1',()=>console.log('ULTRALEVE painel iniciado'));
module.exports=server;
