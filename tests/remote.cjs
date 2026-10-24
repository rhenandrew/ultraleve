const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
test('painel remoto exige convite e troca de senha antes de editar',async()=>{
  const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-auth-test-'));
  const base='http://127.0.0.1:'+port;
  const child=spawn(process.execPath,[path.join(root,'remote-server.cjs')],{env:{...process.env,PORT:String(port),ULTRA_DATA_DIR:dir,ULTRA_ORIGIN:base,ULTRA_SECURE_COOKIE:'0'},stdio:'ignore'});
  const cookies=r=>r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  const post=(url,data,cookie='',method='POST',extra={})=>fetch(base+url,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,...extra},body:JSON.stringify(data),redirect:'manual'});
  try{
    let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(base+'/health')).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,50));}assert(ready);
    const state=JSON.parse(fs.readFileSync(path.join(dir,'account.json'),'utf8'));
    assert.equal((await post('/api/session',{user:'admin',password:'admin'})).status,401);
    const invite=await fetch(base+'/ativar?token='+state.token,{redirect:'manual'});assert.equal(invite.status,303);const setup=cookies(invite);
    const login=await post('/api/session',{user:'admin',password:'admin'},setup);assert.equal(login.status,200);assert.equal((await login.json()).mustChange,true);const tempSession=cookies(login);
    const pub=await fetch(base+'/api/content',{headers:{Origin:'https://bandaultraleve.com.br'}});assert.equal(pub.headers.get('Access-Control-Allow-Origin'),'https://bandaultraleve.com.br');const data=await pub.json();const tag=pub.headers.get('ETag');
    assert.equal((await post('/api/content',data,tempSession,'PUT',{'If-Match':tag})).status,403);
    assert.equal((await post('/api/password',{password:'short'},tempSession)).status,400);
    const changed=await post('/api/password',{password:'SenhaDeTesteSomente123!'},tempSession);assert.equal(changed.status,200);const active=cookies(changed);
    assert.equal((await post('/api/content',data,tempSession,'PUT',{'If-Match':tag})).status,403);
    assert.equal((await post('/api/content',data,active,'PUT',{'If-Match':'old'})).status,409);
    assert.equal((await post('/api/content',data,active,'PUT',{'If-Match':tag,Origin:'https://evil.invalid'})).status,403);
    assert.equal((await post('/api/content',data,active,'PUT',{'If-Match':tag})).status,200);
    assert.equal((await fetch(base+'/ativar?token='+state.token,{redirect:'manual'})).status,403);
    assert.equal((await fetch(base+'/account.json')).status,404);
    const saved=JSON.parse(fs.readFileSync(path.join(dir,'account.json'),'utf8'));assert.equal(saved.setup,false);assert.equal(saved.token,undefined);
    assert.equal((await post('/api/session',{user:'admin',password:'admin'})).status,401);
  }finally{child.kill();await new Promise(r=>child.once('exit',r));}
});
