const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
function createAuth() {
  let credential;
  const derive = (password,salt) => crypto.scryptSync(password,salt,64);
  if (process.env.ULTRA_ADMIN_PASSWORD) {
    const salt=crypto.randomBytes(16).toString('hex');
    credential={salt,hash:derive(process.env.ULTRA_ADMIN_PASSWORD,salt).toString('hex')};
  } else {
    const folder=path.join(os.homedir(),'.codex','private','ultraleve');
    fs.mkdirSync(folder,{recursive:true});
    const file=path.join(folder,'auth.json');
    if(fs.existsSync(file)) credential=JSON.parse(fs.readFileSync(file,'utf8'));
    else {
      const password=crypto.randomBytes(24).toString('base64url');
      const salt=crypto.randomBytes(16).toString('hex');
      credential={salt,hash:derive(password,salt).toString('hex')};
      fs.writeFileSync(file,JSON.stringify(credential),'utf8');
      fs.writeFileSync(path.join(folder,'painel-acesso.txt'),'ULTRALEVE - acesso local\nUsuario: banda\nSenha: '+password+'\n\nGuarde esta senha e compartilhe apenas com quem administra a banda.\n','utf8');
    }
  }
  const failures=new Map();
  return (req,res) => {
    const ip=req.socket.remoteAddress;
    const now=Date.now();const failed=failures.get(ip);
    if(failed && now-failed.start<60000 && failed.count>=10){res.writeHead(429,{'Retry-After':'60'}).end('Tente novamente em um minuto.');return false;}
    let valid=false;
    try {
      const header=req.headers.authorization || '';
      if(header.startsWith('Basic ') && header.length<1024){
        const value=Buffer.from(header.slice(6),'base64').toString('utf8');
        const colon=value.indexOf(':');
        const user=value.slice(0,colon),password=value.slice(colon+1);
        if(colon>=0 && user==='banda') valid=crypto.timingSafeEqual(derive(password,credential.salt),Buffer.from(credential.hash,'hex'));
      }
    } catch { valid=false; }
    if(valid){failures.delete(ip);return true;}
    if(req.headers.authorization) failures.set(ip,!failed || now-failed.start>=60000?{start:now,count:1}:{...failed,count:failed.count+1});
    res.writeHead(401,{'WWW-Authenticate':'Basic realm="ULTRALEVE painel", charset="UTF-8"','Cache-Control':'no-store'}).end('Acesso restrito a administracao da banda.');
    return false;
  };
}
module.exports=createAuth;
