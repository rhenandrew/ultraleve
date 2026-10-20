const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const crypto = require('node:crypto');
const model = require('./content-model.js');
const authorize = require('./auth.cjs')();
const contentFile = process.env.ULTRA_CONTENT_FILE || path.join(root,'content.json');
const revision = text => '"' + crypto.createHash('sha256').update(text).digest('hex') + '"';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (['/painel','/admin.html','/admin.js'].includes(name) && !authorize(req,res)) return;
  if (name === '/health') { res.end('ultraleve-local'); return; }
  if (name === '/api/content') {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    if (req.method === 'GET') {
      try { const text = fs.readFileSync(contentFile,'utf8'); res.setHeader('ETag',revision(text)); res.end(text); }
      catch { res.writeHead(500).end(JSON.stringify({error:'Não foi possível ler o conteúdo.'})); }
      return;
    }
    if (req.method !== 'PUT') { res.writeHead(405).end(); return; }
    if (!authorize(req,res)) return;
    const origin = 'http://127.0.0.1:' + server.address().port;
    if (req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) { res.writeHead(403).end(); return; }
    let body = ''; let tooLarge = false;
    req.on('data', chunk => { body += chunk; if (Buffer.byteLength(body) > 250000) { tooLarge = true; body = ''; } });
    req.on('end', () => {
      if (tooLarge) { res.writeHead(413).end(); return; }
      try {
        const data = model.validate(JSON.parse(body));
        const previous = fs.readFileSync(contentFile,'utf8');
        if (req.headers['if-match'] !== revision(previous)) { res.writeHead(409).end(JSON.stringify({error:'Outra edição foi salva. Recarregue o painel antes de tentar novamente.'})); return; }
        const text = JSON.stringify(data,null,2) + '\n';
        const temporary = contentFile + '.tmp';
        fs.writeFileSync(temporary,text,'utf8'); fs.renameSync(temporary,contentFile);
        res.setHeader('ETag',revision(text)); res.end(JSON.stringify(data));
      } catch { res.writeHead(400).end(JSON.stringify({error:'Não foi possível salvar. Confira os campos e o arquivo de conteúdo.'})); }
    });
    return;
  }
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name === '/painel' ? '/admin.html' : name));
  if (!file.startsWith(root + path.sep) || !types[path.extname(file)]) { res.writeHead(404).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff'});
    res.end(data);
  });
});
server.on('error', err => { if (err.code === 'EADDRINUSE') server.listen(0,'127.0.0.1'); else throw err; });
server.listen(Number(process.env.PORT || 4178), '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + server.address().port;
  console.log(url);
  if (process.argv.includes('--open')) require('node:child_process').spawn('explorer.exe',[url],{detached:true,stdio:'ignore'}).unref();
});
